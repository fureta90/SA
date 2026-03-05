import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Profile E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserEmail: string;
  let testUserPassword: string;

  beforeAll(async () => {
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

    // Crear un usuario de prueba y obtener token
    testUserEmail = `profile-test-${Date.now()}@example.com`;
    testUserPassword = 'password123';

    // Crear usuario
    await request(app.getHttpServer())
      .post('/api-backend/users')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        firstName: 'Profile',
        lastName: 'Test',
      });

    // Obtener token de autenticación
    const loginRes = await request(app.getHttpServer())
      .post('/api-backend/auth/login')
      .send({
        email: testUserEmail,
        password: testUserPassword,
      });

    authToken = loginRes.body.access_token;
  }, 30000); // Timeout de 30 segundos para beforeAll

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api-backend/profile', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toBeDefined();
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user.email).toBe(testUserEmail);
    });

    it('should return user information in profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.user).toHaveProperty('email');
      // Puede tener firstName y lastName si fueron proporcionados
      if (res.body.user.firstName) {
        expect(typeof res.body.user.firstName).toBe('string');
      }
      if (res.body.user.lastName) {
        expect(typeof res.body.user.lastName).toBe('string');
      }
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', 'Bearer invalid-token-12345')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      // Token malformado que simula un token expirado
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should return 401 with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });

    it('should return 401 with missing Bearer prefix', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', authToken)
        .expect(401);
    });

    it('should return 401 with empty token', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', 'Bearer ')
        .expect(401);
    });
  });
});
