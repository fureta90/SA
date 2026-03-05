import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { MailModule } from './mail/mail.module';
import { ForgotPasswordDto } from './mail/dto/forgot-password.dto';
import { CampaignsModule } from './campaigns/campaigns.module'
import { CallsModule } from './calls/calls.module'
import { ScheduleModule } from '@nestjs/schedule'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
    MailModule, /* se importa el módulo de correo */
    // DatabaseModule se carga de forma condicional para no bloquear el inicio
    DatabaseModule, /* se importa el módulo de la base de datos */
    UsersModule,
    AuthModule, /* se importa el módulo de autenticación */
    ProfileModule, /* se importa el módulo de perfil */
    RolesModule, /* se importa el módulo de roles */
    PermissionsModule, /* se importa el módulo de permisos */
    CampaignsModule,
    CallsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {} /* se exporta el módulo */

