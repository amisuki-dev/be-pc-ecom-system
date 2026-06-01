import { DefaultStatus } from '@prisma/client';
import { IsIn, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class FindSpecQueryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsIn([DefaultStatus.ACTIVE, DefaultStatus.INACTIVE, DefaultStatus.DELETED])
  status?: DefaultStatus;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
