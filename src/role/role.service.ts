import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { DefaultStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { nanoid } from 'nanoid';
import { plainToInstance } from 'class-transformer';
import { DefaultRoleOutputDto } from './dto/default-role-output.dto';
import { RoleQueryDto } from './dto/role-query.dto';
import dayjs from 'dayjs';
import { globalConfig } from 'src/common/constants';

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

  private async findActiveRoleByCode(code: string) {
    return this.prisma.role.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
  }

  private async getActiveRoleByCode(code: string) {
    const role = await this.findActiveRoleByCode(code);

    if (!role) {
      throw new NotFoundException('Không tìm thấy quyền');
    }

    return role;
  }

  private async getActivePermissionsByCodes(permissionCodes: string[]) {
    const uniqueCodes = [...new Set(permissionCodes)];

    const permissions = await this.prisma.permission.findMany({
      where: {
        code: {
          in: uniqueCodes,
        },
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });

    if (permissions.length !== uniqueCodes.length) {
      throw new NotFoundException('Danh sách phân quyền có phần tử không tồn tại hoặc đã bị xóa');
    }

    return permissions;
  }

  private async replaceRolePermissions(
    tx: Prisma.TransactionClient,
    roleId: string,
    permissionCodes?: string[],
  ) {
    if (permissionCodes === undefined) {
      return;
    }

    const permissions = await this.getActivePermissionsByCodes(permissionCodes);

    await tx.rolePermission.deleteMany({
      where: {
        roleId,
      },
    });

    if (!permissions.length) {
      return;
    }

    await tx.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId,
        permissionId: permission.id,
        status: DefaultStatus.ACTIVE,
      })),
    });
  }

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
              method: rp.permission.method,
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
      const findExist = await this.findActiveRoleByCode(code);
      if (findExist) {
        throw new BadRequestException('Mã phân quyền đã tồn tại. Vui lòng sử dụng mã khác');
      }
    }

    const checkPermissions = await this.getActivePermissionsByCodes(permissions);

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

      const roleInfo = await tx.role.findUnique({
        where: { id: createRole.id },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
      const formattedData = this.toOutput(roleInfo);
      return {
        data: formattedData,
        code: '000',
        message: 'Tạo phân quyền thành công',
      };
    });
  }

  async findAll(roleQueryDto: RoleQueryDto) {
    const {
      name,
      code,
      status,
      fromDate,
      toDate,
      page = 0,
      limit = 10,
      paging = 'true',
    } = roleQueryDto;
    const normalizedPage = Number(page);
    const normalizedLimit = Number(limit);
    const { booleanConfig } = globalConfig;
    const mappedPaging = booleanConfig[paging] ?? true;
    if (!Number.isInteger(normalizedPage) || normalizedPage < 0) {
      throw new BadRequestException('Page phải là số nguyên không âm');
    }

    if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1) {
      throw new BadRequestException('Limit phải là số nguyên lớn hơn 0');
    }
    const where: Prisma.RoleWhereInput = {};
    if (name) {
      where.name = {
        contains: name,
      };
    }
    if (code) {
      where.code = code;
    }
    where.status = status || { not: DefaultStatus.DELETED };
    if (fromDate && toDate) {
      where.createdAt = {
        gte: dayjs(fromDate).startOf('day').toDate(),
        lte: dayjs(toDate).endOf('day').toDate(),
      };
    }
    if (mappedPaging) {
      const roles = await this.prisma.role.findMany({
        where,
        include: {
          permissions: {
            include: { permission: true },
          },
        },
        skip: normalizedLimit * normalizedPage,
        take: normalizedLimit,
      });
      const total = await this.prisma.role.count({ where });
      return {
        data: roles.map((role) => this.toOutput(role)),
        pagination: {
          page: normalizedPage,
          limit: normalizedLimit,
          total,
        },
        code: '000',
        message: 'Lấy danh sách quyền thành công',
      };
    } else {
      const roles = await this.prisma.role.findMany({
        where,
        include: {
          permissions: {
            include: { permission: true },
          },
        },
        skip: normalizedLimit * normalizedPage,
        take: normalizedLimit,
      });
      return {
        data: roles.map((role) => this.toOutput(role)),
        code: '000',
        message: 'Lấy danh sách quyền thành công',
      };
    }
  }

  async findOne(code: string) {
    if (!code) {
      throw new BadRequestException('Mã định danh là bắt buộc');
    }
    const role = await this.prisma.role.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) {
      throw new BadRequestException('Không tìm thấy quyền');
    }
    const data = this.toOutput(role);

    return {
      data,
      code: '000',
      message: 'Lấy chi tiết quyền thành công',
    };
  }

  async update(code: string, updateRoleDto: UpdateRoleDto) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const role = await this.getActiveRoleByCode(code);
    const { name, code: newCode, status, permissions } = updateRoleDto;
    const data: Prisma.RoleUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (status !== undefined) {
      data.status = status;
    }

    if (newCode !== undefined && newCode !== code) {
      const existRole = await this.findActiveRoleByCode(newCode);

      if (existRole && existRole.id !== role.id) {
        throw new BadRequestException('Mã phân quyền đã tồn tại. Vui lòng sử dụng mã khác');
      }

      data.code = newCode;
    }

    const updatedRole = await this.prisma.$transaction(async (tx) => {
      const roleRecord = await tx.role.update({
        where: {
          id: role.id,
        },
        data,
      });

      await this.replaceRolePermissions(tx, roleRecord.id, permissions);

      return roleRecord;
    });

    const roleInfo = await this.prisma.role.findUnique({
      where: { id: updatedRole.id },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return {
      data: this.toOutput(roleInfo),
      code: '000',
      message: 'Cập nhật phân quyền thành công',
    };
  }

  async remove(code: string) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const role = await this.getActiveRoleByCode(code);

    const user = await this.prisma.user.findFirst({
      where: {
        roleId: role.id,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });

    if (user) {
      throw new BadRequestException('Không thể xóa phân quyền đang được gán cho tài khoản');
    }

    const deletedRole = await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({
        where: {
          roleId: role.id,
        },
      });

      return tx.role.update({
        where: {
          id: role.id,
        },
        data: {
          status: DefaultStatus.DELETED,
        },
        include: {
          permissions: {
            include: { permission: true },
          },
        },
      });
    });

    return {
      data: this.toOutput(deletedRole),
      code: '000',
      message: 'Xóa phân quyền thành công',
    };
  }
}
