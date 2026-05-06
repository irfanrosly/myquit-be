import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(private prisma: PrismaService) {}

  async save(userId: string, dto: OnboardingDto) {
    const data = {
      quitDate: new Date(dto.quitDate),
      yearsSmoked: dto.yearsSmoked,
      tobaccoTypes: dto.tobaccoTypes,
      cigarettesPd: dto.cigarettesPd,
      vapeSessionsPd: dto.vapeSessionsPd,
      ttfc: dto.ttfc,
      pricePerPack: dto.pricePerPack,
      cigsPerPack: dto.cigsPerPack ?? 20,
      pastAttempts: dto.pastAttempts ?? 0,
      longestSmokeFree: dto.longestSmokeFree,
      readiness: dto.readiness,
      confidence: dto.confidence,
      motivations: dto.motivations,
      triggers: dto.triggers,
      supports: dto.supports,
    };

    await this.prisma.quitPlan.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingDone: true },
    });

    return { success: true };
  }

  async get(userId: string) {
    return this.prisma.quitPlan.findUnique({ where: { userId } });
  }
}
