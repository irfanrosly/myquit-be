import { Module } from '@nestjs/common';
import { CravingToolkitController } from './craving-toolkit.controller';
import { CravingToolkitService } from './craving-toolkit.service';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [GamificationModule],
  controllers: [CravingToolkitController],
  providers: [CravingToolkitService],
})
export class CravingToolkitModule {}
