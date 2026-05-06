import {
  IsDateString, IsInt, IsOptional, IsEnum, IsNumber, IsArray,
  IsString, Min, Max,
} from 'class-validator';
import { TobaccoType, TTFC, SmokeFreeRecord } from '@prisma/client';

export class OnboardingDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsSmoked?: number;

  @IsArray()
  @IsEnum(TobaccoType, { each: true })
  tobaccoTypes: TobaccoType[];

  @IsOptional()
  @IsInt()
  @Min(1)
  cigarettesPd?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  vapeSessionsPd?: number;

  @IsOptional()
  @IsEnum(TTFC)
  ttfc?: TTFC;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerPack?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  cigsPerPack?: number;

  @IsDateString()
  quitDate: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  pastAttempts?: number;

  @IsOptional()
  @IsEnum(SmokeFreeRecord)
  longestSmokeFree?: SmokeFreeRecord;

  @IsInt()
  @Min(0)
  @Max(10)
  readiness: number;

  @IsInt()
  @Min(0)
  @Max(10)
  confidence: number;

  @IsArray()
  @IsString({ each: true })
  motivations: string[];

  @IsArray()
  @IsString({ each: true })
  triggers: string[];

  @IsArray()
  @IsString({ each: true })
  supports: string[];
}
