import { Module } from '@nestjs/common'
import { SpeechProxyController } from './speech-proxy.controller'
import { SpeechProxyService } from './speech-proxy.service'

@Module({
  controllers: [SpeechProxyController],
  providers: [SpeechProxyService],
  exports: [SpeechProxyService],
})
export class SpeechProxyModule {}