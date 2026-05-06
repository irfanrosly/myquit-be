import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingDto } from './dto/onboarding.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Post()
  save(@CurrentUser() user: { id: string }, @Body() dto: OnboardingDto) {
    return this.onboarding.save(user.id, dto);
  }

  @Get()
  get(@CurrentUser() user: { id: string }) {
    return this.onboarding.get(user.id);
  }
}
