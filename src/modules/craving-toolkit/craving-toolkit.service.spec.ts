import { Test } from '@nestjs/testing';
import { CravingToolkitService } from './craving-toolkit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

const mockPrisma = {
  activityLog: { create: jest.fn() },
  moodLog: {
    upsert: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
};

const mockGamification = {
  addPoints: jest.fn(),
  checkAndAwardBadges: jest.fn().mockResolvedValue([]),
};

describe('CravingToolkitService', () => {
  let service: CravingToolkitService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CravingToolkitService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GamificationService, useValue: mockGamification },
      ],
    }).compile();
    service = module.get<CravingToolkitService>(CravingToolkitService);
    jest.clearAllMocks();
    mockGamification.checkAndAwardBadges.mockResolvedValue([]);
  });

  it('completeBreathing logs activity and awards 5 points', async () => {
    mockPrisma.activityLog.create.mockResolvedValue({});
    await service.completeBreathing('user1');
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ activityType: 'breathing', pointsEarned: 5 }) }),
    );
    expect(mockGamification.addPoints).toHaveBeenCalledWith('user1', 5, true);
  });

  it('completeDistraction logs activity and awards 3 points', async () => {
    mockPrisma.activityLog.create.mockResolvedValue({});
    await service.completeDistraction('user1');
    expect(mockGamification.addPoints).toHaveBeenCalledWith('user1', 3, true);
  });

  it('logMood upserts today log and awards 2 points', async () => {
    mockPrisma.moodLog.upsert.mockResolvedValue({ mood: 4, craving: 2 });
    await service.logMood('user1', { mood: 4, craving: 2 });
    expect(mockPrisma.moodLog.upsert).toHaveBeenCalled();
    expect(mockGamification.addPoints).toHaveBeenCalledWith('user1', 2, false);
  });
});
