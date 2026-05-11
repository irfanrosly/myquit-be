import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { computeCurrentStreak, computeDaysSinceQuit } from '../../common/utils/streak.util';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, activeQuitPlans, quitPlans, cravingsAggregate, totalBadges] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.quitPlan.count(),
        this.prisma.quitPlan.findMany({ select: { quitDate: true } }),
        this.prisma.userStats.aggregate({ _sum: { cravingsManaged: true } }),
        this.prisma.badge.count(),
      ]);

    let avgDaysSmokeFreee = 0;
    if (quitPlans.length > 0) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const totalDays = quitPlans.reduce((sum, plan) => {
        const quit = new Date(plan.quitDate);
        quit.setHours(0, 0, 0, 0);
        const days = Math.max(0, Math.floor((now.getTime() - quit.getTime()) / (1000 * 60 * 60 * 24)));
        return sum + days;
      }, 0);
      avgDaysSmokeFreee = Math.round((totalDays / quitPlans.length) * 10) / 10;
    }

    const totalCravingsManaged = cravingsAggregate._sum.cravingsManaged ?? 0;

    return {
      totalUsers,
      activeQuitPlans,
      avgDaysSmokeFreee,
      totalCravingsManaged,
      totalBadges,
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        onboardingDone: true,
        createdAt: true,
        quitPlan: { select: { quitDate: true } },
        moodLogs: {
          select: { mood: true, craving: true },
          orderBy: { loggedDate: 'desc' },
          take: 7,
        },
        stats: { select: { totalPoints: true, cravingsManaged: true } },
        _count: { select: { badges: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => {
      const moods = user.moodLogs;
      const avgMood =
        moods.length > 0
          ? Math.round((moods.reduce((s, m) => s + m.mood, 0) / moods.length) * 10) / 10
          : null;
      const avgCraving =
        moods.length > 0
          ? Math.round((moods.reduce((s, m) => s + m.craving, 0) / moods.length) * 10) / 10
          : null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingDone: user.onboardingDone,
        createdAt: user.createdAt,
        quitDate: user.quitPlan?.quitDate ?? null,
        avgMood,
        avgCraving,
        totalPoints: user.stats?.totalPoints ?? 0,
        cravingsManaged: user.stats?.cravingsManaged ?? 0,
        badgeCount: user._count.badges,
      };
    });
  }

  async getUserDetail(id: string) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [user, lastSmoke] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          onboardingDone: true,
          createdAt: true,
          quitPlan: { select: { quitDate: true } },
          stats: { select: { totalPoints: true, cravingsManaged: true } },
          smokeLogs: {
            where: { loggedAt: { gte: thirtyDaysAgo } },
            select: { loggedDate: true, count: true },
            orderBy: { loggedDate: 'asc' },
          },
          moodLogs: {
            where: { loggedDate: { gte: fourteenDaysAgo } },
            select: { loggedDate: true, mood: true, craving: true },
            orderBy: { loggedDate: 'asc' },
          },
          badges: {
            select: { badgeKey: true, earnedAt: true },
            orderBy: { earnedAt: 'asc' },
          },
          _count: { select: { badges: true } },
        },
      }),
      this.prisma.smokeLog.findFirst({
        where: { userId: id },
        orderBy: { loggedAt: 'desc' },
        select: { loggedAt: true },
      }),
    ]);

    const quitDate = user.quitPlan?.quitDate ?? null;

    let slipDaysSinceQuit = 0;
    if (quitDate) {
      const slipGroups = await this.prisma.smokeLog.groupBy({
        by: ['loggedDate'],
        where: { userId: id, loggedDate: { gte: quitDate } },
      });
      slipDaysSinceQuit = slipGroups.length;
    }

    const currentStreak = computeCurrentStreak(quitDate, lastSmoke?.loggedAt ?? null);
    const totalDays = computeDaysSinceQuit(quitDate);
    const totalSmokeFreeDays = Math.max(0, totalDays - slipDaysSinceQuit);

    const smokeByDate = new Map<string, number>();
    for (const log of user.smokeLogs) {
      const dateStr = new Date(log.loggedDate).toISOString().slice(0, 10);
      smokeByDate.set(dateStr, (smokeByDate.get(dateStr) ?? 0) + log.count);
    }
    const smokeLogs = Array.from(smokeByDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const moodByDate = new Map<string, { moodSum: number; cravingSum: number; n: number }>();
    for (const log of user.moodLogs) {
      const dateStr = new Date(log.loggedDate).toISOString().slice(0, 10);
      const e = moodByDate.get(dateStr) ?? { moodSum: 0, cravingSum: 0, n: 0 };
      e.moodSum += log.mood;
      e.cravingSum += log.craving;
      e.n += 1;
      moodByDate.set(dateStr, e);
    }
    const moodLogs = Array.from(moodByDate.entries())
      .map(([date, { moodSum, cravingSum, n }]) => ({
        date,
        mood: Math.round((moodSum / n) * 10) / 10,
        craving: Math.round((cravingSum / n) * 10) / 10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      onboardingDone: user.onboardingDone,
      createdAt: user.createdAt,
      quitDate,
      currentStreak,
      totalSmokeFreeDays,
      slipDays: slipDaysSinceQuit,
      totalPoints: user.stats?.totalPoints ?? 0,
      cravingsManaged: user.stats?.cravingsManaged ?? 0,
      badgeCount: user._count.badges,
      smokeLogs,
      moodLogs,
      badges: user.badges.map((b) => ({ badgeKey: b.badgeKey, earnedAt: b.earnedAt })),
    };
  }

  async getChartData() {
    const [registrationByWeek, activityBreakdown, moodTrend, badgeDistribution] =
      await Promise.all([
        this._getRegistrationByWeek(),
        this._getActivityBreakdown(),
        this._getMoodTrend(),
        this._getBadgeDistribution(),
      ]);

    return { registrationByWeek, activityBreakdown, moodTrend, badgeDistribution };
  }

  private async _getRegistrationByWeek(): Promise<{ week: string; count: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - 84);
    since.setHours(0, 0, 0, 0);

    const users = await this.prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    });

    // Build 12 week buckets — most recent week first, then reverse for chronological order
    const buckets: { week: string; count: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 11; i >= 0; i--) {
      const bucketEnd = new Date(now);
      bucketEnd.setDate(now.getDate() - i * 7);
      const bucketStart = new Date(bucketEnd);
      bucketStart.setDate(bucketEnd.getDate() - 6);

      const dayOfMonth = bucketEnd.getDate();
      let weekNum: number;
      if (dayOfMonth <= 7) weekNum = 1;
      else if (dayOfMonth <= 14) weekNum = 2;
      else if (dayOfMonth <= 21) weekNum = 3;
      else weekNum = 4;

      const monthLabel = bucketEnd.toLocaleString('en-US', { month: 'short' });
      const weekLabel = `W${weekNum} ${monthLabel}`;

      const count = users.filter((u) => {
        const d = new Date(u.createdAt);
        d.setHours(0, 0, 0, 0);
        return d >= bucketStart && d <= bucketEnd;
      }).length;

      buckets.push({ week: weekLabel, count });
    }

    return buckets;
  }

  private async _getActivityBreakdown(): Promise<{ breathing: number; distraction: number }> {
    const [breathingCount, distractionCount] = await Promise.all([
      this.prisma.activityLog.count({ where: { activityType: 'breathing' } }),
      this.prisma.activityLog.count({ where: { activityType: 'distraction' } }),
    ]);

    return { breathing: breathingCount, distraction: distractionCount };
  }

  private async _getMoodTrend(): Promise<{ date: string; avgMood: number; avgCraving: number }[]> {
    const since = new Date();
    since.setDate(since.getDate() - 14);
    since.setHours(0, 0, 0, 0);

    const logs = await this.prisma.moodLog.findMany({
      where: { loggedDate: { gte: since } },
      select: { loggedDate: true, mood: true, craving: true },
    });

    // Group by loggedDate string
    const byDate = new Map<string, { moodSum: number; cravingSum: number; count: number }>();
    for (const log of logs) {
      const dateStr = new Date(log.loggedDate).toISOString().slice(0, 10);
      const existing = byDate.get(dateStr) ?? { moodSum: 0, cravingSum: 0, count: 0 };
      existing.moodSum += log.mood;
      existing.cravingSum += log.craving;
      existing.count += 1;
      byDate.set(dateStr, existing);
    }

    return Array.from(byDate.entries())
      .map(([date, { moodSum, cravingSum, count }]) => ({
        date,
        avgMood: Math.round((moodSum / count) * 10) / 10,
        avgCraving: Math.round((cravingSum / count) * 10) / 10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async _getBadgeDistribution(): Promise<{ key: string; count: number }[]> {
    const groups = await this.prisma.badge.groupBy({
      by: ['badgeKey'],
      _count: { badgeKey: true },
      orderBy: { _count: { badgeKey: 'desc' } },
      take: 7,
    });

    return groups.map((g) => ({ key: g.badgeKey, count: g._count.badgeKey }));
  }
}
