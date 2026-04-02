import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mssql' as const,
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),
        autoLoadEntities: true,
        // ⚠️ synchronize SIEMPRE false en producción.
        // Las migraciones se ejecutan vía docker-entrypoint.sh → run-migrations.js
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') !== 'production',
        extra: {
          connectionTimeout: 30000,
          requestTimeout: 30000,
          max: 10,
        },
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
          connectTimeout: 30000,
          requestTimeout: 30000,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
