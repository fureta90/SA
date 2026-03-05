import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Configurar igual que en main.ts
    app.setGlobalPrefix('api-backend');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    
    await app.init();

    // Esperar un momento para que la conexión a BD se establezca
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000); // Timeout de 30 segundos para beforeEach

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/api-backend (GET)', () => {
    return request(app.getHttpServer())
      .get('/api-backend')
      .expect(200);
  });
});
