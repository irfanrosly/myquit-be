import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { CravingToolkitService } from './craving-toolkit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MoodLogDto } from './dto/mood-log.dto';

@UseGuards(JwtAuthGuard)
@Controller('craving-toolkit')
export class CravingToolkitController {
  constructor(private toolkit: CravingToolkitService) {}

  @Post('breathing/complete')
  completeBreathing(@CurrentUser() user: { id: string }) {
    return this.toolkit.completeBreathing(user.id);
  }

  @Post('distraction/complete')
  completeDistraction(@CurrentUser() user: { id: string }) {
    return this.toolkit.completeDistraction(user.id);
  }

  @Post('mood-log')
  logMood(@CurrentUser() user: { id: string }, @Body() dto: MoodLogDto) {
    return this.toolkit.logMood(user.id, dto);
  }

  @Get('mood-log')
  getTodayLog(@CurrentUser() user: { id: string }) {
    return this.toolkit.getTodayMoodLog(user.id);
  }

  @Get('mood-log/history')
  getHistory(@CurrentUser() user: { id: string }) {
    return this.toolkit.getMoodHistory(user.id);
  }
}
