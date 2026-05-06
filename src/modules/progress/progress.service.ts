import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getProgress(userId: string) {
    const plan = await this.prisma.quitPlan.findUnique({ where: { userId } });
    if (!plan) throw new NotFoundException('No quit plan found');

    const now = new Date();
    const quit = new Date(plan.quitDate);
    quit.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const daysSmokeFreee = Math.max(
      0,
      Math.floor((now.getTime() - quit.getTime()) / (1000 * 60 * 60 * 24)),
    );

    const pricePerPack = Number(plan.pricePerPack ?? 0);
    const cigsPerPack = plan.cigsPerPack ?? 20;
    const cigarettesPd = plan.cigarettesPd ?? 0;
    const dailyCost = (pricePerPack / cigsPerPack) * cigarettesPd;
    const moneySaved = parseFloat((daysSmokeFreee * dailyCost).toFixed(2));

    return {
      daysSmokeFreee,
      moneySaved,
      quitDate: plan.quitDate,
      cigarettesPd,
      dailyCost: parseFloat(dailyCost.toFixed(2)),
    };
  }
}
