import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';

process.env.DB_TYPE = 'better-sqlite3';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-jwt-secret-1234567890';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-1234567890';

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(res.body.app).toBe('ParqueRM');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
