import { Test } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  userStats: { findUnique: jest.fn(), update: jest.fn() },
  badge: { findMany: jest.fn(), createMany: jest.fn() },
  quitPlan: { findUnique: jest.fn() },
  moodLog: { count: jest.fn() },
};

describe('GamificationService', () => {
  let service: GamificationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GamificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<GamificationService>(GamificationService);
    jest.clearAllMocks();
  });

  it('getStats returns totalPoints and cravingsManaged', async () => {
    mockPrisma.userStats.findUnique.mockResolvedValue({ totalPoints: 50, cravingsManaged: 5 });
    const result = await service.getStats('user1');
    expect(result).toEqual({ totalPoints: 50, cravingsManaged: 5 });
  });

  it('getBadges returns earned and locked lists', async () => {
    mockPrisma.badge.findMany.mockResolvedValue([{ badgeKey: 'streak_1', earnedAt: new Date() }]);
    const result = await service.getBadges('user1');
    expect(result.earned).toHaveLength(1);
    expect(result.earned[0].key).toBe('streak_1');
    expect(result.locked.length).toBeGreaterThan(0);
  });

  it('checkAndAwardBadges returns empty array when no quit plan', async () => {
    mockPrisma.quitPlan.findUnique.mockResolvedValue(null);
    mockPrisma.userStats.findUnique.mockResolvedValue(null);
    mockPrisma.badge.findMany.mockResolvedValue([]);
    mockPrisma.moodLog.count.mockResolvedValue(0);
    const result = await service.checkAndAwardBadges('user1');
    expect(result).toEqual([]);
  });

  it('addPoints increments totalPoints', async () => {
    mockPrisma.userStats.update.mockResolvedValue({});
    await service.addPoints('user1', 5, false);
    expect(mockPrisma.userStats.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalPoints: { increment: 5 } }) }),
    );
  });
});
