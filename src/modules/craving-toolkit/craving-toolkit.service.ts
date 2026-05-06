import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { MoodLogDto } from './dto/mood-log.dto';

@Injectable()
export class CravingToolkitService {
  constructor(
    private prisma: PrismaService,
    private gamification: GamificationService,
  ) {}

  async completeBreathing(userId: string) {
    await this.prisma.activityLog.create({
      data: { userId, activityType: 'breathing', pointsEarned: 5 },
    });
    await this.gamification.addPoints(userId, 5, true);
    const newBadges = await this.gamification.checkAndAwardBadges(userId);
    return { pointsEarned: 5, newBadges };
  }

  async completeDistraction(userId: string) {
    await this.prisma.activityLog.create({
      data: { userId, activityType: 'distraction', pointsEarned: 3 },
    });
    await this.gamification.addPoints(userId, 3, true);
    const newBadges = await this.gamification.checkAndAwardBadges(userId);
    return { pointsEarned: 3, newBadges };
  }

  async logMood(userId: string, dto: MoodLogDto) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const log = await this.prisma.moodLog.upsert({
      where: { userId_loggedDate: { userId, loggedDate: today } },
      update: { mood: dto.mood, craving: dto.craving, note: dto.note },
      create: { userId, mood: dto.mood, craving: dto.craving, note: dto.note, loggedDate: today },
    });

    await this.gamification.addPoints(userId, 2, false);
    const newBadges = await this.gamification.checkAndAwardBadges(userId);
    return { log, pointsEarned: 2, newBadges };
  }

  async getTodayMoodLog(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.prisma.moodLog.findFirst({
      where: { userId, loggedDate: today },
    });
  }

  async getMoodHistory(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return this.prisma.moodLog.findMany({
      where: { userId, loggedDate: { gte: sevenDaysAgo } },
      orderBy: { loggedDate: 'desc' },
    });
  }
}
