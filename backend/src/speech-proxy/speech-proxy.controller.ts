import {
  Controller, Post, Get, Param, Req,
  UseGuards, UseInterceptors, UploadedFile,
  BadRequestException, HttpCode, Logger,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { SpeechProxyService } from './speech-proxy.service'

@ApiTags('speech-proxy')
@Controller('speech')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SpeechProxyController {
  private readonly logger = new Logger(SpeechProxyController.name)

  constructor(private readonly speechProxy: SpeechProxyService) {}

  /**
   * POST /api-backend/speech/upload
   * Recibe el audio del frontend y lo reenvía al producer externo.
   * Devuelve la respuesta del producer directamente.
   */
  @Post('upload')
  @HttpCode(200)
  @ApiOperation({ summary: 'Proxy: subir audio al producer externo' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('audio/') && !file.originalname.match(/\.(mp3|wav|m4a|ogg|webm)$/i)) {
          return cb(new BadRequestException('Solo se permiten archivos de audio'), false)
        }
        cb(null, true)
      },
      limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
    }),
  )
  async uploadAudio(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Se requiere archivo de audio')

    const callId = req.body?.call_id ?? `manual-${Date.now()}`
    this.logger.log(`Proxy upload: ${file.originalname} (${file.size} bytes), call_id=${callId}`)

    return this.speechProxy.uploadAudio(file, callId)
  }

  /**
   * POST /api-backend/speech/analyze
   * Encola el análisis en el producer externo y devuelve { job_id, status, poll_url }.
   */
  @Post('analyze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Proxy: encolar análisis en el producer externo' })
  async submitAnalysis(@Req() req: any) {
    const body = req.body
    if (!body?.audio_uri) throw new BadRequestException('audio_uri es requerido')

    this.logger.log(`Proxy analyze: call_id=${body.call_id ?? 'N/A'}`)
    return this.speechProxy.submitAnalysis(body)
  }

  /**
   * GET /api-backend/speech/status/:jobId
   * Consulta el estado del job en el producer externo.
   */
  @Get('status/:jobId')
  @ApiOperation({ summary: 'Proxy: estado del job de análisis' })
  async getStatus(@Param('jobId') jobId: string) {
    return this.speechProxy.getJobStatus(jobId)
  }

  /**
   * GET /api-backend/speech/result/:jobId
   * Obtiene el resultado completo del análisis desde el producer.
   */
  @Get('result/:jobId')
  @ApiOperation({ summary: 'Proxy: resultado completo del job' })
  async getResult(@Param('jobId') jobId: string) {
    return this.speechProxy.getJobResult(jobId)
  }
}