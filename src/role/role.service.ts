import { BadRequestException, Injectable } from '@nestjs/common';
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
