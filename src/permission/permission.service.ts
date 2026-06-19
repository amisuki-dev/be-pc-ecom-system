import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DefaultStatus, MethodType, Prisma } from '@prisma/client';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { FindPermissionQueryDto } from './dto/find-permission-query.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PrismaService } from 'src/prisma.service';
import { nanoid } from 'nanoid';
import { globalConfig } from 'src/common/constants';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  private toOutput(permission: {
    name: string;
    code: string;
    status: DefaultStatus;
    path: string;
    method: MethodType;
  }) {
    return {
      name: permission.name,
      code: permission.code,
      status: permission.status,
      path: permission.path,
      method: permission.method,
    };
  }

  private async findActivePermissionByCode(code: string) {
    return this.prisma.permission.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
  }

  private async getActivePermissionByCode(code: string) {
    const permission = await this.findActivePermissionByCode(code);

    if (!permission) {
      throw new NotFoundException('Không tìm thấy phân quyền');
    }

    return permission;
  }

  async create(createPermissionDto: CreatePermissionDto) {
    const { name, code, path, method, status } = createPermissionDto;
    const normalizedCode = code || nanoid();

    const findExistPermission = await this.findActivePermissionByCode(normalizedCode);

    if (findExistPermission) {
      throw new BadRequestException('Mã phân quyền đã tồn tại');
    }

    const createdPermission = await this.prisma.permission.create({
      data: {
        name,
        code: normalizedCode,
        path,
        method,
        status: status || DefaultStatus.INACTIVE,
      },
    });

    return {
      data: {
        name: createdPermission.name,
        code: createdPermission.code,
        status: createdPermission.status,
        path: createdPermission.path,
        method: createdPermission.method,
      },
      code: 0,
      message: 'Create permission success',
    };
  }

  async findAll(query: FindPermissionQueryDto) {
    const { name, code, status, method, path, page = 0, limit = 10, paging = 'true' } = query;
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

    const where: Prisma.PermissionWhereInput = {};

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (code) {
      where.code = code;
    }

    if (path) {
      where.path = path;
    }

    if (method) {
      where.method = method;
    }

    where.status = status || {
      not: DefaultStatus.DELETED,
    };

    const permissions = await this.prisma.permission.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      ...(mappedPaging
        ? {
            skip: normalizedPage * normalizedLimit,
            take: normalizedLimit,
          }
        : {}),
    });

    const data = permissions.map((permission) => this.toOutput(permission));

    if (!mappedPaging) {
      return {
        data,
        code: 0,
        message: 'Get list permission success',
      };
    }

    const total = await this.prisma.permission.count({ where });

    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
      },
      code: 0,
      message: 'Get list permission success',
    };
  }

  findOne(id: string) {
    return this.getActivePermissionByCode(id);
  }

  async update(code: string, updatePermissionDto: UpdatePermissionDto) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const permission = await this.getActivePermissionByCode(code);
    const { name, code: newCode, path, method, status } = updatePermissionDto;
    const data: Prisma.PermissionUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (path !== undefined) {
      data.path = path;
    }

    if (method !== undefined) {
      data.method = method;
    }

    if (status !== undefined) {
      data.status = status;
    }

    if (newCode !== undefined && newCode !== code) {
      const existPermission = await this.findActivePermissionByCode(newCode);

      if (existPermission && existPermission.id !== permission.id) {
        throw new BadRequestException('Mã phân quyền đã tồn tại');
      }

      data.code = newCode;
    }

    const updatedPermission = await this.prisma.permission.update({
      where: {
        id: permission.id,
      },
      data,
    });

    return {
      data: this.toOutput(updatedPermission),
      code: 0,
      message: 'Update permission success',
    };
  }

  remove(id: string) {
    return `This action removes a #${id} permission`;
  }
}
