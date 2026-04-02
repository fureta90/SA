import 'dotenv/config'
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { join } from 'path'

async function bootstrap() {
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    // dotenv/config ya cargó las variables — process.env disponible sin ConfigService
    const urlApp = process.env.URL_APP;

    app.enableCors({
      origin: [
        'http://localhost:5174',
        'http://localhost:5173',
        ...(urlApp ? [urlApp] : []),
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      credentials: true,
    })
    
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads',
    })
    
    
    app.setGlobalPrefix('api-backend');
    
    // Aumentar límite de payload para permitir foto en base64 (data URL)
    // (por defecto body-parser suele limitar a ~100kb)
    app.use(json({ limit: '15mb' }));
    app.use(urlencoded({ extended: true, limit: '15mb' }));

    /* se activan las validaciones de los datos de entrada */
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    // Configuración de Swagger
    const config = new DocumentBuilder()
      .setTitle('Api')
      .setDescription('API')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: 'Ingresa el token JWT',
          in: 'header',
        },
        'JWT-auth', // Este nombre se usará en los decoradores @ApiBearerAuth()
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-backend/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    const port = process.env.PORT ?? 3002;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
  } catch (error) {
    console.error('Error starting application:', error);
    // Iniciar de todas formas después de 5 segundos
    setTimeout(() => {
      bootstrap();
    }, 5001);
  }
}
bootstrap();