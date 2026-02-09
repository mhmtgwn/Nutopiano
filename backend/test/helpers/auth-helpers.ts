import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function loginAndGetToken(
  app: INestApplication,
  phone: string,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ phone })
    .expect(201);

  expect(res.body.accessToken).toBeDefined();
  return res.body.accessToken;
}
