import { Controller, Get, Param } from '@nestjs/common'
import { AudioService } from './audio.service'

@Controller('calls')
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  /**
   * GET /calls/:callId/playback-url
   *
   * Devuelve una Signed URL temporal para reproducir el audio
   * directamente desde Google Cloud Storage.
   *
   * Response:
   * {
   *   "url": "https://storage.googleapis.com/...",
   *   "expiresIn": 900   // segundos
   * }
   *
   * Uso en frontend:
   *   const { url } = await fetch(`/calls/${callId}/playback-url`).then(r => r.json())
   *   audioElement.src = url
   *   audioElement.play()
   */
  @Get(':callId/playback-url')
  getPlaybackUrl(@Param('callId') callId: string) {
    return this.audioService.getPlaybackUrl(callId)
  }
}