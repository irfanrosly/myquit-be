import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('SmokeLog (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let cookies: string[];
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
    prisma = app.get(PrismaService);

    const email = `smoke-${Date.now()}@test.local`;
    const reg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Password123!', name: 'Smoke Tester' })
      .expect(201);
    cookies = reg.headers['set-cookie'] as unknown as string[];
    userId = reg.body.data.id;

    const quitDate = new Date();
    quitDate.setDate(quitDate.getDate() - 10);
    await prisma.quitPlan.create({
      data: {
        userId,
        quitDate,
        cigsPerPack: 20,
        // Prisma Decimal accepts string or number; use string for safety
        pricePerPack: '15' as unknown as number,
        cigarettesPd: 10,
      },
    });
    // userStats is auto-created on register, but ensure totalPoints is high enough to test penalty
    await prisma.userStats.update({
      where: { userId },
      data: { totalPoints: 50 },
    });
  });

  afterAll(async () => {
    await prisma.smokeLog.deleteMany({ where: { userId } });
    await prisma.badge.deleteMany({ where: { userId } });
    await prisma.userStats.deleteMany({ where: { userId } });
    await prisma.quitPlan.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('POST /smoke-log creates row, decrements points, returns updated stats', async () => {
    const res = await request(app.getHttpServer())
      .post('/smoke-log')
      .set('Cookie', cookies)
      .expect(201);

    expect(res.body.data).toMatchObject({
      count: 1,
      totalPoints: 48,
    });
    expect(res.body.data.currentStreak).toBeLessThan(2);
    expect(res.body.data.totalSmokeFreeDays).toBe(9);
  });

  it('GET /smoke-log/history returns the inserted log', async () => {
    const res = await request(app.getHttpServer())
      .get('/smoke-log/history?days=14')
      .set('Cookie', cookies)
      .expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].count).toBe(1);
  });

  it('GET /smoke-log/heatmap returns one slip-day', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app.getHttpServer())
      .get(`/smoke-log/heatmap?from=${today}&to=${today}`)
      .set('Cookie', cookies)
      .expect(200);
    expect(res.body.data.days).toEqual([{ date: today, count: 1 }]);
  });

  it('GET /progress reflects slip in currentStreak and moneySavedActual', async () => {
    const res = await request(app.getHttpServer())
      .get('/progress')
      .set('Cookie', cookies)
      .expect(200);
    const p = res.body.data;
    expect(p.totalSmokeFreeDays).toBe(9);
    expect(p.currentStreak).toBeLessThan(2);
    expect(p.lastSlipAt).not.toBeNull();
    expect(p.moneySavedActual).toBeCloseTo(74.25, 1); // (10*10 - 1) * 0.75
  });
});
