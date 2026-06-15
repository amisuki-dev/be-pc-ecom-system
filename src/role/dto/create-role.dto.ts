import { DefaultStatus } from '@prisma/client';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MaxLength(255)
  @IsNotEmpty({ message: 'Tên phân quyền không được để trống ' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsOptional()
  @IsEnum(DefaultStatus)
  status?: DefaultStatus;

  @IsNotEmpty({ message: 'Thiếu dữ liệu role' })
  @IsArray({ message: 'Permissions phải là một danh sách (array)' })
  @IsString({ each: true, message: 'Mỗi phần tử trong permissions phải là một chuỗi' })
  permissions: string[];
}
