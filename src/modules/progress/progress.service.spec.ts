import { Test } from '@nestjs/testing';
import { ProgressService } from './progress.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

const mockPrisma = {
  quitPlan: { findUnique: jest.fn() },
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

  it('computes days smoke free correctly', async () => {
    const quitDate = new Date();
    quitDate.setDate(quitDate.getDate() - 10);
    mockPrisma.quitPlan.findUnique.mockResolvedValue({
      quitDate,
      cigarettesPd: 10,
      pricePerPack: 15,
      cigsPerPack: 20,
    });

    const result = await service.getProgress('user1');
    expect(result.daysSmokeFreee).toBe(10);
    expect(result.moneySaved).toBeCloseTo(75, 0);
  });
});
