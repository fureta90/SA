import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { ConfigModule } from '@nestjs/config'
import { UsersModule } from './users/users.module'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './auth/auth.module'
import { ProfileModule } from './profile/profile.module'
import { RolesModule } from './roles/roles.module'
import { PermissionsModule } from './permissions/permissions.module'
import { MailModule } from './mail/mail.module'
import { CampaignsModule } from './campaigns/campaigns.module'
import { CallsModule } from './calls/calls.module'
import { ScheduleModule } from '@nestjs/schedule'
import { SpeechProxyModule } from './speech-proxy/speech-proxy.module'
import { BillingModule } from './billing/billing.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    MailModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProfileModule,
    RolesModule,
    PermissionsModule,
    CampaignsModule,
    CallsModule,
    SpeechProxyModule,
    BillingModule,
    // ScheduleModule is kept – UploadWorker still uses @Cron
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}