import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SmokeLogService } from './smoke-log.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { HistoryQueryDto } from './dto/history-query.dto';
import { HeatmapQueryDto } from './dto/heatmap-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('smoke-log')
export class SmokeLogController {
  constructor(private smokeLog: SmokeLogService) {}

  @Post()
  create(@CurrentUser() user: { id: string }) {
    return this.smokeLog.create(user.id);
  }

  @Get('history')
  getHistory(@CurrentUser() user: { id: string }, @Query() q: HistoryQueryDto) {
    return this.smokeLog.getHistory(user.id, q.days);
  }

  @Get('heatmap')
  getHeatmap(@CurrentUser() user: { id: string }, @Query() q: HeatmapQueryDto) {
    return this.smokeLog.getHeatmap(user.id, q.from, q.to);
  }
}
