import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

describe('Users E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let createdUserId: string;
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

    // Crear un usuario de prueba y obtener token para las pruebas
    testUserEmail = `test-${Date.now()}@example.com`;
    testUserPassword = 'password123';

    // Crear usuario
    const createRes = await request(app.getHttpServer())
      .post('/api-backend/users')
      .send({
        email: testUserEmail,
        password: testUserPassword,
        firstName: 'Test',
        lastName: 'User',
      });

    createdUserId = createRes.body.id || createRes.body.userId;

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
    // Limpiar: eliminar usuario de prueba si existe
    if (app && createdUserId && authToken) {
      try {
        await request(app.getHttpServer())
          .delete(`/api-backend/users/${createdUserId}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        // Ignorar errores de limpieza
      }
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api-backend/users', () => {
    it('should create a new user successfully', async () => {
      const newUserEmail = `newuser-${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/api-backend/users')
        .send({
          email: newUserEmail,
          password: 'password123',
          firstName: 'Nuevo',
          lastName: 'Usuario',
        })
        .expect(201);

      expect(res.body).toBeDefined();
      expect(res.body.email).toBe(newUserEmail);
      expect(res.body.firstName).toBe('Nuevo');
      expect(res.body.lastName).toBe('Usuario');
    });

    it('should return 400 with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api-backend/users')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 with password too short', async () => {
      await request(app.getHttpServer())
        .post('/api-backend/users')
        .send({
          email: 'user@example.com',
          password: '12345', // Menos de 6 caracteres
        })
        .expect(400);
    });

    it('should return 400 with missing email', async () => {
      await request(app.getHttpServer())
        .post('/api-backend/users')
        .send({
          password: 'password123',
        })
        .expect(400);
    });

    it('should return 400 with missing password', async () => {
      await request(app.getHttpServer())
        .post('/api-backend/users')
        .send({
          email: 'user@example.com',
        })
        .expect(400);
    });

    it('should return 400 with duplicate email', async () => {
      // Intentar crear usuario con email ya existente
      await request(app.getHttpServer())
        .post('/api-backend/users')
        .send({
          email: testUserEmail,
          password: 'password123',
        })
        .expect(400);
    });
  });

  describe('GET /api-backend/users', () => {
    it('should get all users with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api-backend/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/users')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api-backend/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /api-backend/users/:id', () => {
    it('should get user by id with valid token', async () => {
      if (!createdUserId) {
        // Si no tenemos ID, crear un usuario primero
        const createRes = await request(app.getHttpServer())
          .post('/api-backend/users')
          .send({
            email: `temp-${Date.now()}@example.com`,
            password: 'password123',
          });
        createdUserId = createRes.body.id || createRes.body.userId;
      }

      const res = await request(app.getHttpServer())
        .get(`/api-backend/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.id || res.body.userId).toBe(createdUserId);
    });

    it('should return 404 with non-existent user id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .get(`/api-backend/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/api-backend/users/${createdUserId}`)
        .expect(401);
    });
  });

  describe('PUT /api-backend/users/:id', () => {
    it('should update user successfully with valid token', async () => {
      if (!createdUserId) {
        const createRes = await request(app.getHttpServer())
          .post('/api-backend/users')
          .send({
            email: `temp-${Date.now()}@example.com`,
            password: 'password123',
          });
        createdUserId = createRes.body.id || createRes.body.userId;
      }

      const res = await request(app.getHttpServer())
        .put(`/api-backend/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Actualizado',
          lastName: 'Usuario',
        })
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.firstName).toBe('Actualizado');
      expect(res.body.lastName).toBe('Usuario');
    });

    it('should return 400 with invalid email format', async () => {
      await request(app.getHttpServer())
        .put(`/api-backend/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: 'invalid-email',
        })
        .expect(400);
    });

    it('should return 400 with password too short', async () => {
      await request(app.getHttpServer())
        .put(`/api-backend/users/${createdUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          password: '12345',
        })
        .expect(400);
    });

    it('should return 404 with non-existent user id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .put(`/api-backend/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
        })
        .expect(404);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .put(`/api-backend/users/${createdUserId}`)
        .send({
          firstName: 'Test',
        })
        .expect(401);
    });
  });

  describe('DELETE /api-backend/users/:id', () => {
    it('should delete user successfully with valid token', async () => {
      // Crear un usuario temporal para eliminar
      const createRes = await request(app.getHttpServer())
        .post('/api-backend/users')
        .send({
          email: `delete-${Date.now()}@example.com`,
          password: 'password123',
        });

      const userIdToDelete = createRes.body.id || createRes.body.userId;

      await request(app.getHttpServer())
        .delete(`/api-backend/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verificar que el usuario fue eliminado
      await request(app.getHttpServer())
        .get(`/api-backend/users/${userIdToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 with non-existent user id', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await request(app.getHttpServer())
        .delete(`/api-backend/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .delete(`/api-backend/users/${createdUserId}`)
        .expect(401);
    });
  });
});
