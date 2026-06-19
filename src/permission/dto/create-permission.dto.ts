import { DefaultStatus, MethodType } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePermissionDto {
  @IsString()
  @MaxLength(255)
  @IsNotEmpty({ message: 'Tên phân quyền không được để trống' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsString()
  @MaxLength(255)
  @IsNotEmpty({ message: 'Đường dẫn không được để trống' })
  path: string;

  @IsEnum(MethodType)
  method: MethodType;

  @IsOptional()
  @IsEnum(DefaultStatus)
  status?: DefaultStatus;
}
