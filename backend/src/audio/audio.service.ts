import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
const { Storage } = require('@google-cloud/storage')
import { Call } from '../calls/entities/call.entity'

@Injectable()
export class AudioService {
  private readonly logger  = new Logger(AudioService.name)
  private readonly storage = new Storage()

  /** Duración por defecto de la URL firmada (en minutos) */
  private readonly signedUrlTtlMinutes = Number(process.env.SIGNED_URL_TTL_MINUTES) || 15

  constructor(
    @InjectRepository(Call) private callsRepo: Repository<Call>,
  ) {}

  /**
   * Genera una Signed URL de lectura temporal para el audio de una llamada.
   *
   * El cliente puede usar esta URL directamente en un <audio src="...">
   * sin pasar tráfico por nuestro servidor.
   *
   * @param callId  - ID de la llamada
   * @returns       - URL firmada temporal
   */
  async getPlaybackUrl(callId: string): Promise<{ url: string; expiresIn: number }> {
    const call = await this.callsRepo.findOne({ where: { id: callId } })

    if (!call) {
      throw new NotFoundException(`Call ${callId} no encontrada`)
    }

    if (!call.audioUri) {
      throw new NotFoundException(`Call ${callId} no tiene audio en GCS`)
    }

    const { bucket, filePath } = this.parseGcsUri(call.audioUri)
    const expiresMs = this.signedUrlTtlMinutes * 60 * 1000

    const [url] = await this.storage
      .bucket(bucket)
      .file(filePath)
      .getSignedUrl({
        version: 'v4',
        action:  'read',
        expires: Date.now() + expiresMs,
      })

    this.logger.debug(`Signed URL generada para call ${callId} (expira en ${this.signedUrlTtlMinutes}min)`)

    return {
      url,
      expiresIn: this.signedUrlTtlMinutes * 60, // segundos
    }
  }

  /**
   * Parsea una URI de GCS ("gs://bucket/path/to/file.wav") en bucket + filePath.
   */
  private parseGcsUri(gcsUri: string): { bucket: string; filePath: string } {
    const withoutScheme = gcsUri.replace(/^gs:\/\//, '')
    const slashIndex    = withoutScheme.indexOf('/')

    if (slashIndex === -1) {
      throw new Error(`URI de GCS inválida (sin path): ${gcsUri}`)
    }

    return {
      bucket:   withoutScheme.substring(0, slashIndex),
      filePath: withoutScheme.substring(slashIndex + 1),
    }
  }
}