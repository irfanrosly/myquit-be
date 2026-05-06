import { Controller, Get, UseGuards } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private gamification: GamificationService) {}

  @Get('stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.gamification.getStats(user.id);
  }

  @Get('badges')
  getBadges(@CurrentUser() user: { id: string }) {
    return this.gamification.getBadges(user.id);
  }
}
