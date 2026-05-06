import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  computeCurrentStreak,
  computeDaysSinceQuit,
} from '../../common/utils/streak.util';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async getProgress(userId: string) {
    const plan = await this.prisma.quitPlan.findUnique({ where: { userId } });
    if (!plan) throw new NotFoundException('No quit plan found');

    const [lastSlip, sumAgg, distinctDays] = await Promise.all([
      this.prisma.smokeLog.findFirst({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
        select: { loggedAt: true },
      }),
      this.prisma.smokeLog.aggregate({
        where: { userId },
        _sum: { count: true },
      }),
      this.prisma.smokeLog.groupBy({
        by: ['loggedDate'],
        where: { userId },
      }),
    ]);

    const daysSinceQuit = computeDaysSinceQuit(plan.quitDate);
    const currentStreak = computeCurrentStreak(plan.quitDate, lastSlip?.loggedAt ?? null);
    const totalSmokeFreeDays = Math.max(0, daysSinceQuit - distinctDays.length);

    const cigsPerPack = plan.cigsPerPack ?? 20;
    const pricePerPack = plan.pricePerPack !== null && plan.pricePerPack !== undefined
      ? Number(plan.pricePerPack)
      : null;
    const cigarettesPd = plan.cigarettesPd ?? null;

    let moneySavedActual: number | null = null;
    let dailyCost: number | null = null;
    if (pricePerPack !== null && cigarettesPd !== null) {
      const pricePerCig = pricePerPack / cigsPerPack;
      const baselineCigs = daysSinceQuit * cigarettesPd;
      const loggedCigs = sumAgg._sum.count ?? 0;
      const avoided = Math.max(0, baselineCigs - loggedCigs);
      moneySavedActual = parseFloat((avoided * pricePerCig).toFixed(2));
      dailyCost = parseFloat((pricePerCig * cigarettesPd).toFixed(2));
    }

    return {
      currentStreak,
      totalSmokeFreeDays,
      lastSlipAt: lastSlip?.loggedAt ?? null,
      moneySavedActual,
      quitDate: plan.quitDate,
      cigarettesPd,
      dailyCost,
    };
  }
}
