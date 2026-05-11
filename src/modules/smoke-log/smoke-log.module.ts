import { Module } from '@nestjs/common';
import { SmokeLogController } from './smoke-log.controller';
import { SmokeLogService } from './smoke-log.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  controllers: [SmokeLogController],
  providers: [SmokeLogService],
  exports: [SmokeLogService],
})
export class SmokeLogModule {}
