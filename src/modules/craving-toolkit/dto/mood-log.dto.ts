import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class MoodLogDto {
  @IsInt()
  @Min(1)
  @Max(5)
  mood: number;

  @IsInt()
  @Min(1)
  @Max(5)
  craving: number;

  @IsOptional()
  @IsString()
  note?: string;
}
