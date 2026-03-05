import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule, // necesario para forRootAsync
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config = {
          type: 'mssql' as const,
          host: configService.get<string>('DB_HOST'),
          port: Number(configService.get<string>('DB_PORT')),
          username: configService.get<string>('DB_USER'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [__dirname + '/../**/*.entity{.ts,.js}'],
          // Mantenerlo desactivado por defecto. Activar solo si se necesita inicializar la BD.
          synchronize: configService.get<string>('TYPEORM_SYNC') === 'true',
          retryAttempts: 0,
          retryDelay: 0,
          autoLoadEntities: true,
          logging: false,
          // Permitir que la aplicación inicie aunque la conexión falle
          keepConnectionAlive: false,
          extra: {
            connectionTimeout: 2000,
            requestTimeout: 2000,
            max: 1, // Limitar conexiones
          },
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
            connectTimeout: 2000,
            requestTimeout: 2000,
            abortTransactionOnError: false,
          },
        };
        return config;
      },
    }),
  ],
})
export class DatabaseModule implements OnModuleInit {
  onModuleInit() {
    // No hacer nada, permitir que la aplicación continúe incluso si la BD falla
    console.log('DatabaseModule initialized (connection may fail, but app will continue)');
  }
}
