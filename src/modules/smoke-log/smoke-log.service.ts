import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import {
  computeCurrentStreak,
  computeDaysSinceQuit,
} from '../../common/utils/streak.util';

@Injectable()
export class SmokeLogService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  async create(userId: string) {
    const now = new Date();
    const loggedDate = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    ));

    const log = await this.prisma.smokeLog.create({
      data: { userId, count: 1, loggedAt: now, loggedDate },
    });

    await this.gamification.applySlipPenalty(userId);

    const [stats, plan, lastSlip, distinctDays] = await Promise.all([
      this.prisma.userStats.findUnique({ where: { userId } }),
      this.prisma.quitPlan.findUnique({ where: { userId } }),
      this.prisma.smokeLog.findFirst({
        where: { userId },
        orderBy: { loggedAt: 'desc' },
        select: { loggedAt: true },
      }),
      this.prisma.smokeLog.groupBy({
        by: ['loggedDate'],
        where: { userId },
      }),
    ]);

    const currentStreak = computeCurrentStreak(plan?.quitDate ?? null, lastSlip?.loggedAt ?? null);
    const daysSinceQuit = computeDaysSinceQuit(plan?.quitDate ?? null);
    const totalSmokeFreeDays = Math.max(0, daysSinceQuit - distinctDays.length);

    return {
      id: log.id,
      loggedAt: log.loggedAt,
      loggedDate: log.loggedDate,
      count: log.count,
      currentStreak,
      totalSmokeFreeDays,
      totalPoints: stats?.totalPoints ?? 0,
    };
  }
}
