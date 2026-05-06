import { Test } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  quitPlan: { upsert: jest.fn(), findUnique: jest.fn() },
  user: { update: jest.fn() },
};

describe('OnboardingService', () => {
  let service: OnboardingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<OnboardingService>(OnboardingService);
    jest.clearAllMocks();
  });

  it('upserts quit plan and marks onboarding done', async () => {
    mockPrisma.quitPlan.upsert.mockResolvedValue({});
    mockPrisma.user.update.mockResolvedValue({});

    const dto = {
      tobaccoTypes: ['cigarette' as any],
      quitDate: '2026-06-01',
      readiness: 8,
      confidence: 7,
      motivations: ['health'],
      triggers: ['stress'],
      supports: ['family'],
    };

    const result = await service.save('user1', dto as any);
    expect(result).toEqual({ success: true });
    expect(mockPrisma.quitPlan.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user1' } }),
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { onboardingDone: true } }),
    );
  });

  it('get returns quit plan for user', async () => {
    const plan = { id: 'p1', userId: 'user1', quitDate: new Date() };
    mockPrisma.quitPlan.findUnique.mockResolvedValue(plan);
    const result = await service.get('user1');
    expect(result).toEqual(plan);
  });
});
