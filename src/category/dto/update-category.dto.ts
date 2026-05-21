import { CategoryType, DefaultStatus } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsIn([DefaultStatus.ACTIVE, DefaultStatus.INACTIVE])
  status?: DefaultStatus;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  parentCode?: string | null;

  @IsOptional()
  @IsEnum([CategoryType])
  type?: CategoryType;
}
