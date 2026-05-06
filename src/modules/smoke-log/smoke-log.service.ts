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

  async getHistory(userId: string, days = 14) {
    const since = new Date(Date.now() - days * 86400000);
    const items = await this.prisma.smokeLog.findMany({
      where: { userId, loggedAt: { gte: since } },
      orderBy: { loggedAt: 'desc' },
      select: { id: true, loggedAt: true, count: true },
    });
    return { items };
  }

  async getHeatmap(userId: string, from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    const rows = await this.prisma.smokeLog.groupBy({
      by: ['loggedDate'],
      where: {
        userId,
        loggedDate: { gte: fromDate, lte: toDate },
      },
      _sum: { count: true },
      orderBy: { loggedDate: 'asc' },
    });

    const days = rows.map((r) => ({
      date: toIsoDate(r.loggedDate),
      count: r._sum.count ?? 0,
    }));

    return { days };
  }
}

function toIsoDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}
