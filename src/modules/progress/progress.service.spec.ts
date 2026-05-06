import { Test } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  quitPlan: { findUnique: jest.fn() },
  smokeLog: {
    findFirst: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
};

describe('ProgressService', () => {
  let service: ProgressService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ProgressService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ProgressService>(ProgressService);
    jest.clearAllMocks();
  });

  it('throws NotFoundException when no quit plan exists', async () => {
    mockPrisma.quitPlan.findUnique.mockResolvedValue(null);
    await expect(service.getProgress('user1')).rejects.toThrow(NotFoundException);
  });

  it('returns full smoke-free streak when no slips exist', async () => {
    const quitDate = new Date();
    quitDate.setDate(quitDate.getDate() - 10);
    mockPrisma.quitPlan.findUnique.mockResolvedValue({
      quitDate, cigarettesPd: 10, pricePerPack: 15, cigsPerPack: 20,
    });
    mockPrisma.smokeLog.findFirst.mockResolvedValue(null);
    mockPrisma.smokeLog.aggregate.mockResolvedValue({ _sum: { count: 0 } });
    mockPrisma.smokeLog.groupBy.mockResolvedValue([]);

    const result = await service.getProgress('user1');

    expect(result.currentStreak).toBe(10);
    expect(result.totalSmokeFreeDays).toBe(10);
    expect(result.lastSlipAt).toBeNull();
    expect(result.moneySavedActual).toBeCloseTo(75, 0);
  });

  it('resets currentStreak after a slip and subtracts logged cigs from money saved', async () => {
    const quitDate = new Date();
    quitDate.setDate(quitDate.getDate() - 10);
    const lastSlip = new Date();
    lastSlip.setDate(lastSlip.getDate() - 2);

    mockPrisma.quitPlan.findUnique.mockResolvedValue({
      quitDate, cigarettesPd: 10, pricePerPack: 15, cigsPerPack: 20,
    });
    mockPrisma.smokeLog.findFirst.mockResolvedValue({ loggedAt: lastSlip });
    mockPrisma.smokeLog.aggregate.mockResolvedValue({ _sum: { count: 4 } });
    mockPrisma.smokeLog.groupBy.mockResolvedValue([
      { loggedDate: new Date() }, { loggedDate: lastSlip },
    ]);

    const result = await service.getProgress('user1');

    // currentStreak ~ 2 (since last slip 2 days ago)
    expect(result.currentStreak).toBeGreaterThanOrEqual(1);
    expect(result.currentStreak).toBeLessThanOrEqual(2);
    // total days since quit = 10, slip days = 2, → 8 smoke-free
    expect(result.totalSmokeFreeDays).toBe(8);
    expect(result.lastSlipAt).toEqual(lastSlip);
    // baseline cigs = 10 days * 10 cigs = 100 ; logged = 4 ; avoided = 96
    // pricePerCig = 15/20 = 0.75 ; saved = 96 * 0.75 = 72
    expect(result.moneySavedActual).toBeCloseTo(72, 0);
  });

  it('returns null moneySavedActual when plan lacks pricing or cigarettesPd', async () => {
    const quitDate = new Date();
    quitDate.setDate(quitDate.getDate() - 5);
    mockPrisma.quitPlan.findUnique.mockResolvedValue({
      quitDate, cigarettesPd: null, pricePerPack: null, cigsPerPack: 20,
    });
    mockPrisma.smokeLog.findFirst.mockResolvedValue(null);
    mockPrisma.smokeLog.aggregate.mockResolvedValue({ _sum: { count: 0 } });
    mockPrisma.smokeLog.groupBy.mockResolvedValue([]);

    const result = await service.getProgress('user1');

    expect(result.moneySavedActual).toBeNull();
  });
});
