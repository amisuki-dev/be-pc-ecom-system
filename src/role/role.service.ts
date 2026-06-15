import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DefaultStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { nanoid } from 'nanoid';
import { plainToInstance } from 'class-transformer';
import { DefaultRoleOutputDto } from './dto/default-role-output.dto';

type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: {
    permissions: {
      include: {
        permission: true;
      };
    };
  };
}>;

@Injectable()
export class RoleService {
  constructor(private prisma: PrismaService) {}

  private toOutput(role: RoleWithPermissions) {
    return plainToInstance(
      DefaultRoleOutputDto,
      {
        name: role.name,
        code: role.code,
        status: role.status,
        permissions: role.permissions
          ? role.permissions.map((rp) => ({
              name: rp.permission.name,
              code: rp.permission.code,
              status: rp.permission.status,
              path: rp.permission.path,
              method: (rp.permission as any).method, // Ép kiểu tạm thời nếu schema.prisma chưa chạy npx prisma generate lại trường method
            }))
          : [],
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  async create(createRoleDto: CreateRoleDto) {
    const { name, code, status, permissions } = createRoleDto;

    if (code) {
      const findExist = await this.prisma.role.findFirst({
        where: {
          code,
          NOT: {
            status: DefaultStatus.DELETED,
          },
        },
      });
      if (findExist) {
        throw new BadRequestException('Mã phân quyền đã tồn tại. Vui lòng sử dụng mã khác');
      }
    }

    const checkPermissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: permissions,
        },
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });

    if (checkPermissions.length !== permissions.length) {
      throw new BadRequestException(
        'Danh sách phân quyền đã chọn có phân quyền đã xóa hoặc không hợp lệ',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const createRole = await tx.role.create({
        data: {
          name,
          code: code || nanoid(),
          status: status || DefaultStatus.ACTIVE,
        },
      });

      const rolePermissionData = checkPermissions.map((p) => ({
        roleId: createRole.id,
        permissionId: p.id,
        status: DefaultStatus.ACTIVE,
      }));

      await tx.rolePermission.createMany({
        data: rolePermissionData,
      });

      // Lấy lại dữ liệu đầy đủ kèm permissions hệ thống để format đầu ra
      const roleInfo = await tx.role.findUnique({
        where: { id: createRole.id },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
      const formattedData = this.toOutput(roleInfo as RoleWithPermissions);
      return {
        data: formattedData,
        code: '000',
        message: 'Tạo phân quyền thành công',
      };
    });
  }

  findAll() {
    return `This action returns all role`;
  }

  findOne(id: number) {
    return `This action returns a #${id} role`;
  }

  update(id: number, updateRoleDto: UpdateRoleDto) {
    return `This action updates a #${id} role`;
  }

  remove(id: number) {
    return `This action removes a #${id} role`;
  }
}
