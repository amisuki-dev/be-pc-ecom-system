import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DefaultStatus } from '@prisma/client';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { PrismaService } from 'src/prisma.service';
import { nanoid } from 'nanoid';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

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

  findAll() {
    return `This action returns all permission`;
  }

  findOne(id: string) {
    return this.getActivePermissionByCode(id);
  }

  update(id: string, updatePermissionDto: UpdatePermissionDto) {
    void updatePermissionDto;
    return `This action updates a #${id} permission`;
  }

  remove(id: string) {
    return `This action removes a #${id} permission`;
  }
}
