import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });
    await this.prisma.userStats.create({ data: { userId: user.id } });

    const tokens = await this.generateTokens(user.id, user.email);
    return {
      tokens,
      user: { id: user.id, email: user.email, name: user.name, onboardingDone: user.onboardingDone, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.email);
    return {
      tokens,
      user: { id: user.id, email: user.email, name: user.name, onboardingDone: user.onboardingDone, role: user.role },
    };
  }

  async refresh(tokenId: string, rawToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { id: tokenId },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const valid = await bcrypt.compare(rawToken, stored.tokenHash);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(stored.userId, stored.user.email);
    return {
      tokens,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        name: stored.user.name,
        onboardingDone: stored.user.onboardingDone,
        role: stored.user.role,
      },
    };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async generateTokens(userId: string, email: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      { secret: this.config.get('JWT_SECRET'), expiresIn: this.config.get('JWT_EXPIRES_IN') },
    );

    const rawToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = await bcrypt.hash(rawToken, 10);
    const tokenRecord = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Cookie value: "{tokenId}.{rawToken}" — O(1) lookup by ID
    const refreshToken = `${tokenRecord.id}.${rawToken}`;
    return { accessToken, refreshToken };
  }
}
