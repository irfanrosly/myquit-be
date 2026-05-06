import { Test } from '@nestjs/testing';
import { SmokeLogService } from './smoke-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

const mockPrisma = {
  smokeLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  userStats: { findUnique: jest.fn() },
  quitPlan: { findUnique: jest.fn() },
};

const mockGamification = {
  applySlipPenalty: jest.fn(),
};

describe('SmokeLogService', () => {
  let service: SmokeLogService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SmokeLogService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GamificationService, useValue: mockGamification },
      ],
    }).compile();
    service = module.get<SmokeLogService>(SmokeLogService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a SmokeLog row, applies slip penalty, and returns derived stats', async () => {
      const inserted = {
        id: 'log-1',
        userId: 'user1',
        count: 1,
        loggedAt: new Date('2026-05-06T10:00:00Z'),
        loggedDate: new Date('2026-05-06T00:00:00Z'),
        createdAt: new Date(),
      };
      mockPrisma.smokeLog.create.mockResolvedValue(inserted);
      mockGamification.applySlipPenalty.mockResolvedValue(undefined);
      mockPrisma.userStats.findUnique.mockResolvedValue({ totalPoints: 8 });
      mockPrisma.smokeLog.findFirst.mockResolvedValue(inserted);
      mockPrisma.smokeLog.aggregate.mockResolvedValue({ _sum: { count: 1 } });
      mockPrisma.smokeLog.groupBy.mockResolvedValue([{ loggedDate: inserted.loggedDate }]);
      mockPrisma.quitPlan.findUnique.mockResolvedValue({
        quitDate: new Date('2026-04-26'),
        cigarettesPd: 10, pricePerPack: 15, cigsPerPack: 20,
      });

      const result = await service.create('user1');

      expect(mockPrisma.smokeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          count: 1,
          loggedAt: expect.any(Date),
          loggedDate: expect.any(Date),
        }),
      });
      expect(mockGamification.applySlipPenalty).toHaveBeenCalledWith('user1');
      expect(result).toMatchObject({
        id: 'log-1',
        count: 1,
        totalPoints: 8,
      });
      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
      expect(result.totalSmokeFreeDays).toBeGreaterThanOrEqual(0);
    });

    it('uses today (UTC midnight) for loggedDate', async () => {
      const inserted = {
        id: 'log-2', userId: 'user1', count: 1,
        loggedAt: new Date(), loggedDate: new Date(), createdAt: new Date(),
      };
      mockPrisma.smokeLog.create.mockResolvedValue(inserted);
      mockGamification.applySlipPenalty.mockResolvedValue(undefined);
      mockPrisma.userStats.findUnique.mockResolvedValue({ totalPoints: 0 });
      mockPrisma.smokeLog.findFirst.mockResolvedValue(inserted);
      mockPrisma.smokeLog.aggregate.mockResolvedValue({ _sum: { count: 1 } });
      mockPrisma.smokeLog.groupBy.mockResolvedValue([{ loggedDate: inserted.loggedDate }]);
      mockPrisma.quitPlan.findUnique.mockResolvedValue({
        quitDate: new Date(), cigarettesPd: 0, pricePerPack: 0, cigsPerPack: 20,
      });

      await service.create('user1');

      const calledArgs = mockPrisma.smokeLog.create.mock.calls[0][0].data;
      const date: Date = calledArgs.loggedDate;
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
    });
  });
});
