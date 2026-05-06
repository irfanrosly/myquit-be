import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('findById returns user without passwordHash', async () => {
    const mockUser = { id: '1', email: 'a@b.com', name: 'A', onboardingDone: false };
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await service.findById('1');
    expect(result).toEqual(mockUser);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
      select: expect.not.objectContaining({ passwordHash: true }),
    });
  });

  it('update patches only provided fields', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: '1', name: 'New Name' });
    await service.update('1', { name: 'New Name' });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { name: 'New Name' },
      select: expect.any(Object),
    });
  });
});
