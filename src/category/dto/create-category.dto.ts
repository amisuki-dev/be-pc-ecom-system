import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DefaultStatus, CategoryType } from '@prisma/client';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

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
  @IsEnum(CategoryType)
  type?: CategoryType;
}
