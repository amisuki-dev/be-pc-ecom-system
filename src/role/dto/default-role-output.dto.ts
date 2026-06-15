import { Exclude, Expose, Type } from 'class-transformer';

export class PermissionOutputDto {
  @Exclude()
  id: string;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  status: string;

  @Expose()
  path: string;

  @Expose()
  method: string;
}

export class DefaultRoleOutputDto {
  @Exclude() // Giữ lại Expose nếu bạn muốn trả Id về cho client dùng
  id: string;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  status: string;

  @Expose()
  @Type(() => PermissionOutputDto)
  permissions: PermissionOutputDto[]; // Chuyển thành một mảng các Permission
}
