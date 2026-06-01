import { DefaultStatus } from '@prisma/client';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProductspecDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  productCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  specsCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  value: string;

  @IsOptional()
  @IsIn([DefaultStatus.ACTIVE, DefaultStatus.INACTIVE])
  status?: DefaultStatus;
}
