import { IsOptional, IsString, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Gender, Education } from '@prisma/client';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  race?: string;

  @IsOptional()
  @IsEnum(Education)
  education?: Education;

  @IsOptional()
  @IsString()
  occupation?: string;
}
