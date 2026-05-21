import { DefaultStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsIn([DefaultStatus.ACTIVE, DefaultStatus.INACTIVE])
  status?: DefaultStatus;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  categoryCode?: string | null;

  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  brandCode?: string | null;
}
