import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ALL_BADGES = [
  { key: 'streak_1', label: '1 Day Smoke-Free', category: 'streak', threshold: 1 },
  { key: 'streak_3', label: '3 Days Smoke-Free', category: 'streak', threshold: 3 },
  { key: 'streak_7', label: '1 Week Smoke-Free', category: 'streak', threshold: 7 },
  { key: 'streak_14', label: '2 Weeks Smoke-Free', category: 'streak', threshold: 14 },
  { key: 'streak_30', label: '1 Month Smoke-Free', category: 'streak', threshold: 30 },
  { key: 'streak_60', label: '2 Months Smoke-Free', category: 'streak', threshold: 60 },
  { key: 'streak_90', label: '3 Months Smoke-Free', category: 'streak', threshold: 90 },
  { key: 'streak_180', label: '6 Months Smoke-Free', category: 'streak', threshold: 180 },
  { key: 'streak_365', label: '1 Year Smoke-Free', category: 'streak', threshold: 365 },
  { key: 'savings_100', label: 'Saved RM100', category: 'savings', threshold: 100 },
  { key: 'savings_500', label: 'Saved RM500', category: 'savings', threshold: 500 },
  { key: 'savings_1000', label: 'Saved RM1000', category: 'savings', threshold: 1000 },
  { key: 'cravings_5', label: '5 Cravings Managed', category: 'cravings', threshold: 5 },
  { key: 'cravings_10', label: '10 Cravings Managed', category: 'cravings', threshold: 10 },
  { key: 'cravings_20', label: '20 Cravings Managed', category: 'cravings', threshold: 20 },
  { key: 'logging_7', label: '7 Days Logged', category: 'logging', threshold: 7 },
  { key: 'logging_30', label: '30 Days Logged', category: 'logging', threshold: 30 },
];

const STREAK_BADGE_KEYS = [
  'streak_1', 'streak_3', 'streak_7', 'streak_14',
  'streak_30', 'streak_60', 'streak_90', 'streak_180', 'streak_365',
];

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  async getStats(userId: string) {
    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    return { totalPoints: stats?.totalPoints ?? 0, cravingsManaged: stats?.cravingsManaged ?? 0 };
  }

  async getBadges(userId: string) {
    const earned = await this.prisma.badge.findMany({ where: { userId } });
    const earnedKeys = new Set(earned.map((b) => b.badgeKey));

    return {
      earned: earned.map((b) => ({
        key: b.badgeKey,
        label: ALL_BADGES.find((a) => a.key === b.badgeKey)?.label ?? b.badgeKey,
        earnedAt: b.earnedAt,
      })),
      locked: ALL_BADGES.filter((b) => !earnedKeys.has(b.key)).map((b) => ({
        key: b.key,
        label: b.label,
      })),
    };
  }

  async checkAndAwardBadges(userId: string): Promise<string[]> {
    const [plan, stats, earnedBadges, totalLogged] = await Promise.all([
      this.prisma.quitPlan.findUnique({ where: { userId } }),
      this.prisma.userStats.findUnique({ where: { userId } }),
      this.prisma.badge.findMany({ where: { userId }, select: { badgeKey: true } }),
      this.prisma.moodLog.count({ where: { userId } }),
    ]);

    if (!plan) return [];

    const earnedKeys = new Set(earnedBadges.map((b) => b.badgeKey));

    const now = new Date();
    const quit = new Date(plan.quitDate);
    quit.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const days = Math.max(0, Math.floor((now.getTime() - quit.getTime()) / (1000 * 60 * 60 * 24)));

    const pricePerPack = Number(plan.pricePerPack ?? 0);
    const dailyCost = (pricePerPack / (plan.cigsPerPack ?? 20)) * (plan.cigarettesPd ?? 0);
    const moneySaved = days * dailyCost;

    const cravingsManaged = stats?.cravingsManaged ?? 0;
    const newBadges: string[] = [];

    for (const badge of ALL_BADGES) {
      if (earnedKeys.has(badge.key)) continue;

      let earned = false;
      if (badge.category === 'streak') earned = days >= badge.threshold;
      if (badge.category === 'savings') earned = moneySaved >= badge.threshold;
      if (badge.category === 'cravings') earned = cravingsManaged >= badge.threshold;
      if (badge.category === 'logging') earned = totalLogged >= badge.threshold;

      if (earned) newBadges.push(badge.key);
    }

    if (newBadges.length > 0) {
      await this.prisma.badge.createMany({
        data: newBadges.map((key) => ({ userId, badgeKey: key })),
        skipDuplicates: true,
      });
    }

    return newBadges;
  }

  async addPoints(userId: string, points: number, incrementCravings = false) {
    await this.prisma.userStats.update({
      where: { userId },
      data: {
        totalPoints: { increment: points },
        ...(incrementCravings ? { cravingsManaged: { increment: 1 } } : {}),
      },
    });
  }

  async applySlipPenalty(userId: string): Promise<void> {
    const stats = await this.prisma.userStats.findUnique({ where: { userId } });
    const current = stats?.totalPoints ?? 0;
    const next = Math.max(0, current - 2);

    await this.prisma.$transaction([
      this.prisma.userStats.update({
        where: { userId },
        data: { totalPoints: next },
      }),
      this.prisma.badge.deleteMany({
        where: { userId, badgeKey: { in: STREAK_BADGE_KEYS } },
      }),
    ]);
  }
}
