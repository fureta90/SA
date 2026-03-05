import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { existsSync, createReadStream, unlinkSync } from 'fs'
import { join, basename, isAbsolute } from 'path'
import FormData from 'form-data'
import axios from 'axios'
import { Call, CallStatus } from '../entities/call.entity'
import { Campaign } from '../../campaigns/entities/campaign.entity'

const UPLOAD_URL   = 'https://audio-processor-788612607917.us-central1.run.app/process'
const UPLOAD_TOKEN = process.env.SPEECH_UPLOAD_TOKEN || ''

function toAbsPath(p: string): string {
  if (isAbsolute(p)) return p
  return join(process.cwd(), p)
}

@Injectable()
export class UploadWorker {
  private readonly logger = new Logger(UploadWorker.name)

  constructor(
    @InjectRepository(Call)     private callsRepo: Repository<Call>,
    @InjectRepository(Campaign) private campaignsRepo: Repository<Campaign>,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async run() {
    const pending = await this.callsRepo.find({
      where: { status: CallStatus.PENDING },
      take: 10,
    })

    if (pending.length === 0) return

    this.logger.log(`Procesando ${pending.length} grabación(es) en paralelo...`)
    await Promise.allSettled(pending.map(call => this.processCall(call)))
  }

  private async processCall(call: Call) {
    // ── Verificar que la campaña exista y esté activa ────────────────────────
    const campaign = await this.campaignsRepo.findOne({
      where: { id: call.campaignId },
    })

    if (!campaign) {
      this.logger.warn(`Campaña no encontrada para call ${call.id} — marcando error`)
      await this.callsRepo.update(call.id, {
        status:       CallStatus.ERROR,
        errorMessage: 'Campaña no encontrada',
      })
      return
    }

    if (!campaign.isActive) {
      this.logger.warn(`Campaña "${campaign.name}" inactiva — se omite call ${call.id}`)
      return
    }

    await this.callsRepo.update(call.id, { status: CallStatus.UPLOADING })

    try {
      if (!call.audioTempPath) {
        throw new Error('audioTempPath vacío en la BD')
      }

      const absPath = this.resolveAudioPath(call.audioTempPath)

      this.logger.log(`Iniciando upload para ${call.id} (${absPath})`)

      // ── Subir a Google Cloud vía audio-processor ──────────────────────────
      const form = new FormData()
      form.append('file', createReadStream(absPath))
      form.append('call_id', call.id)
      form.append('target_sample_rate', '16000')
      form.append('apply_filters', 'true')

      const { data } = await axios.post(UPLOAD_URL, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${UPLOAD_TOKEN}`,
        },
        timeout: 600_000,
        maxContentLength: Infinity,
        maxBodyLength:    Infinity,
      })

      this.logger.log(`Respuesta recibida: ${JSON.stringify(data)}`)

      // ── Eliminar archivo temporal del servidor ────────────────────────────
      try {
        unlinkSync(absPath)
        this.logger.log(`Archivo temporal eliminado: ${absPath}`)
      } catch (unlinkErr: any) {
        this.logger.warn(`No se pudo eliminar temporal ${absPath}: ${unlinkErr.message}`)
      }

      // ── Actualizar BD — solo guardamos la URI de GCS ──────────────────────
      const gcsUri = data.gcs_uri ?? data.audio_uri

      await this.callsRepo.update(call.id, {
        status:        CallStatus.UPLOADED,
        audioUri:      gcsUri,
        callId:        data.call_id,
        audioTempPath: null, // ya no se guarda nada local
      })

      this.logger.log(`✓ Upload OK: ${call.id} → ${gcsUri}`)

    } catch (err: any) {
      const status = err.response?.status
      const detail = err.response?.data ?? err.message
      this.logger.error(`✗ Upload ERROR ${call.id} [${status}]: ${JSON.stringify(detail)}`)
      await this.callsRepo.update(call.id, {
        status:       CallStatus.ERROR,
        errorMessage: typeof detail === 'string' ? detail : JSON.stringify(detail),
        retryCount:   () => 'retryCount + 1' as any,
      })
    }
  }

  /**
   * Resuelve la ruta absoluta del archivo temporal.
   * Intenta la ruta directa; si no existe, busca en uploads/audio como fallback.
   */
  private resolveAudioPath(audioTempPath: string): string {
    let absPath = toAbsPath(audioTempPath)

    if (existsSync(absPath)) return absPath

    const fallbackPath = join(process.cwd(), 'uploads', 'audio', basename(audioTempPath))
    if (existsSync(fallbackPath)) {
      this.logger.warn(`Archivo encontrado en fallback: ${fallbackPath}`)
      return fallbackPath
    }

    throw new Error(`Archivo no encontrado en ninguna ubicación: ${audioTempPath}`)
  }
}