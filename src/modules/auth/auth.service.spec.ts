import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  userStats: { create: jest.fn() },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('mock-token') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('15m') } },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: '1', email: 'test@test.com' });
      await expect(
        service.register({ email: 'test@test.com', password: 'password', name: 'Test' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user and returns tokens on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1', email: 'a@b.com', name: 'A', onboardingDone: false,
      });
      mockPrisma.userStats.create.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

      const result = await service.register({ email: 'a@b.com', password: 'password123', name: 'A' });
      expect(result.user.email).toBe('a@b.com');
      expect(result.tokens.accessToken).toBe('mock-token');
    });
  });

  describe('login', () => {
    it('throws UnauthorizedException for unknown email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: 'x@x.com', password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'x@x.com', passwordHash: hash, name: 'X', onboardingDone: false,
      });
      await expect(service.login({ email: 'x@x.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });

    it('returns tokens for valid credentials', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1', email: 'x@x.com', name: 'X', passwordHash: hash, onboardingDone: false,
      });
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

      const result = await service.login({ email: 'x@x.com', password: 'correct' });
      expect(result.user.email).toBe('x@x.com');
      expect(result.tokens.accessToken).toBe('mock-token');
    });
  });

  describe('refresh', () => {
    it('throws UnauthorizedException when token not found', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('bad-id', 'bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt1',
        expiresAt: new Date(Date.now() - 1000),
        tokenHash: 'hash',
        userId: 'u1',
        user: { id: 'u1', email: 'a@b.com', name: 'A', onboardingDone: false },
      });
      await expect(service.refresh('rt1', 'token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deletes all refresh tokens for user', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      await service.logout('user1');
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user1' } });
    });
  });
});
