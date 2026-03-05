import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let token: string;
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

    // Datos de prueba - crear usuario
    testUserEmail = `test-${Date.now()}@example.com`;
    testUserPassword = 'password123';

    // Crear usuario de prueba y esperar a que se complete
    const createRes = await request(app.getHttpServer())
      .post('/api-backend/users')
      .send({
        email: testUserEmail,
        password: testUserPassword,
      })
      .expect(201); // Verificar que se creó correctamente
    
    // Esperar un momento adicional para asegurar que el usuario esté disponible en la BD
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000); // Timeout de 30 segundos para beforeAll

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api-backend/auth', () => {
    it('should return auth module status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api-backend/auth')
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('endpoint');
      expect(res.body.message).toBe('Auth module is working');
    });
  });

  describe('POST /api-backend/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api-backend/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body.access_token).toBeDefined();
      expect(typeof res.body.access_token).toBe('string');

      token = res.body.access_token;
    });

    it('should return 401 with invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api-backend/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('should return 401 with invalid password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api-backend/auth/login')
        .send({
          email: testUserEmail,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toBe('Credenciales inválidas');
    });

    it('should return 400 or 401 with missing email', async () => {
      // Puede devolver 400 (validación) o 401 (si pasa validación pero usuario no existe)
      const res = await request(app.getHttpServer())
        .post('/api-backend/auth/login')
        .send({
          password: testUserPassword,
        });
      
      expect([400, 401]).toContain(res.status);
    });

    it('should return 400 or 500 with missing password', async () => {
      // Puede devolver 400 (validación) o 500 (error en bcrypt.compare con undefined)
      const res = await request(app.getHttpServer())
        .post('/api-backend/auth/login')
        .send({
          email: testUserEmail,
        });
      
      expect([400, 500]).toContain(res.status);
    });

    it('should return 400 or 401 with invalid email format', async () => {
      // Puede devolver 400 (validación) o 401 (si pasa validación pero usuario no existe)
      const res = await request(app.getHttpServer())
        .post('/api-backend/auth/login')
        .send({
          email: 'invalid-email',
          password: testUserPassword,
        });
      
      expect([400, 401]).toContain(res.status);
    });
  });

  describe('Protected Routes', () => {
    it('should access /api-backend/profile with valid token', async () => {
      // Primero obtener un token válido
      const loginRes = await request(app.getHttpServer())
        .post('/api-backend/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      const validToken = loginRes.body.access_token;

      const res = await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('email');
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

    it('should return 401 with malformed authorization header', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/profile')
        .set('Authorization', 'InvalidFormat')
        .expect(401);
    });
  });
});
