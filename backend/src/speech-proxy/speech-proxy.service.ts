import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosInstance } from 'axios'
// eslint-disable-next-line @typescript-eslint name-convention
const FormData = require('form-data')

@Injectable()
export class SpeechProxyService {
  private readonly logger = new Logger(SpeechProxyService.name)
  private readonly http: AxiosInstance
  private readonly token: string

  constructor(private readonly config: ConfigService) {
    const baseURL =
      this.config.get<string>('SPEECH_PRODUCER_URL') ??
      'https://speech-analytics-producer-kku6uewffq-uc.a.run.app'

    this.token =
      this.config.get<string>('SPEECH_ANALYZE_TOKEN') ?? 'SAFindControl2026'

    this.http = axios.create({
      baseURL,
      timeout: 300_000, // 5 min — uploads pueden ser lentos
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    })

    this.logger.log(`SpeechProxy → ${baseURL}`)
  }

  /**
   * Reenvía el archivo de audio al producer externo.
   * El archivo viene como Buffer (multer memoryStorage).
   */
  async uploadAudio(
    file: Express.Multer.File,
    callId: string,
  ): Promise<any> {
    const form = new FormData()
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
      knownLength: file.size,
    })
    form.append('call_id', callId)

    try {
      const { data } = await this.http.post('/upload', form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${this.token}`,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      })
      return data
    } catch (err: any) {
      const msg = err?.response?.data ?? err?.message ?? 'Error al subir audio al producer'
      this.logger.error(`uploadAudio failed: ${JSON.stringify(msg)}`)
      throw new InternalServerErrorException(msg)
    }
  }

  /**
   * Encola un trabajo de análisis en el producer externo.
   */
  async submitAnalysis(body: Record<string, any>): Promise<any> {
    try {
      const { data } = await this.http.post('/analyze', body)
      return data
    } catch (err: any) {
      const msg = err?.response?.data ?? err?.message ?? 'Error al encolar análisis'
      this.logger.error(`submitAnalysis failed: ${JSON.stringify(msg)}`)
      throw new InternalServerErrorException(msg)
    }
  }

  /**
   * Consulta el estado de un job.
   */
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const { data } = await this.http.get(`/status/${jobId}`)
      return data
    } catch (err: any) {
      const msg = err?.response?.data ?? err?.message ?? 'Error al consultar estado'
      this.logger.error(`getJobStatus(${jobId}) failed: ${JSON.stringify(msg)}`)
      throw new InternalServerErrorException(msg)
    }
  }

  /**
   * Obtiene el resultado completo de un job terminado.
   */
  async getJobResult(jobId: string): Promise<any> {
    try {
      const { data } = await this.http.get(`/result/${jobId}`)
      return data
    } catch (err: any) {
      const msg = err?.response?.data ?? err?.message ?? 'Error al obtener resultado'
      this.logger.error(`getJobResult(${jobId}) failed: ${JSON.stringify(msg)}`)
      throw new InternalServerErrorException(msg)
    }
  }
}