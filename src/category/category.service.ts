import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'src/prisma.service';
import { DefaultStatus, Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { plainToInstance } from 'class-transformer';
import { DefaultCategoryOutputDto } from './dto/default-category-output.dto';
import dayjs from 'dayjs';
import { FindCategoryQueryDto } from './dto/find-category-query.dto';

type CategoryWithParent = Prisma.CategoryGetPayload<{
  include: {
    parent: true;
  };
}>;

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  private toOutput(category: CategoryWithParent) {
    return plainToInstance(
      DefaultCategoryOutputDto,
      {
        ...category,
        parentInfo: category.parent
          ? {
              name: category.parent.name,
              code: category.parent.code,
              status: category.parent.status,
            }
          : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async findActiveCategoryByCode(code: string) {
    return this.prisma.category.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
  }

  private async getActiveCategoryByCode(code: string) {
    const category = await this.findActiveCategoryByCode(code);

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return category;
  }

  async create(createCategoryDto: CreateCategoryDto) {
    const { name, code, status, parentCode, type } = createCategoryDto;

    const data: Prisma.CategoryCreateInput = {
      name,
      status: status || DefaultStatus.ACTIVE,
      code: code || nanoid(),
      type,
    };

    const findExistCategory = await this.findActiveCategoryByCode(data.code);

    if (findExistCategory) {
      throw new BadRequestException('Mã danh mục đã tồn tại');
    }

    if (parentCode) {
      const findExistParentCategory = await this.getActiveCategoryByCode(parentCode);

      data.parent = {
        connect: {
          id: findExistParentCategory.id,
        },
      };
    }

    const createdCategory = await this.prisma.category.create({
      data,
      include: {
        parent: true,
      },
    });

    return {
      data: this.toOutput(createdCategory),
      code: 0,
      message: 'Create category success',
    };
  }

  async findAll(query: FindCategoryQueryDto) {
    const { name, code, status, parentCode, fromDate, toDate, page = 0, limit = 10 } = query;
    const normalizedPage = Number(page);
    const normalizedLimit = Number(limit);

    if (!Number.isInteger(normalizedPage) || normalizedPage < 0) {
      throw new BadRequestException('Page phải là số nguyên không âm');
    }

    if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1) {
      throw new BadRequestException('Limit phải là số nguyên lớn hơn 0');
    }

    const where: Prisma.CategoryWhereInput = {};

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (code) {
      where.code = code;
    }

    where.status = status || {
      not: DefaultStatus.DELETED,
    };

    if (parentCode) {
      const parentCategory = await this.getActiveCategoryByCode(parentCode);
      where.parentId = parentCategory.id;
    }

    if (fromDate && toDate) {
      where.createdAt = {
        gte: dayjs(fromDate).startOf('day').toDate(),
        lte: dayjs(toDate).endOf('day').toDate(),
      };
    }

    const categories = await this.prisma.category.findMany({
      where,
      include: {
        parent: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: normalizedPage * normalizedLimit,
      take: normalizedLimit,
    });
    const total = await this.prisma.category.count({ where });
    return {
      data: categories.map((category) => this.toOutput(category)),
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
      },
      code: 0,
      message: 'Get list category success',
    };
  }

  async findOne(code: string) {
    const categoryInfo = await this.prisma.category.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
      include: {
        parent: true,
      },
    });

    if (!categoryInfo) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return {
      data: this.toOutput(categoryInfo),
      code: 0,
      message: 'Get category success',
    };
  }

  async update(code: string, updateCategoryDto: UpdateCategoryDto) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const category = await this.getActiveCategoryByCode(code);
    const { name, code: newCode, status, parentCode, type } = updateCategoryDto;
    const data: Prisma.CategoryUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (status !== undefined) {
      data.status = status;
    }

    if (newCode !== undefined && newCode !== code) {
      const existCategory = await this.findActiveCategoryByCode(newCode);

      if (existCategory && existCategory.id !== category.id) {
        throw new BadRequestException('Mã danh mục đã tồn tại');
      }

      data.code = newCode;
    }

    if (parentCode !== undefined) {
      if (!parentCode) {
        data.parent = {
          disconnect: true,
        };
      } else {
        const parentCategory = await this.getActiveCategoryByCode(parentCode);

        if (parentCategory.id === category.id) {
          throw new BadRequestException('Danh mục cha không được trùng với danh mục hiện tại');
        }

        data.parent = {
          connect: {
            id: parentCategory.id,
          },
        };
      }
    }
    if (type !== undefined) {
      data.type = type;
    }

    const updatedCategory = await this.prisma.category.update({
      where: {
        id: category.id,
      },
      data,
      include: {
        parent: true,
      },
    });

    return {
      data: this.toOutput(updatedCategory),
      code: 0,
      message: 'Update category success',
    };
  }

  async remove(code: string) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const category = await this.getActiveCategoryByCode(code);

    const childCategory = await this.prisma.category.findFirst({
      where: {
        parentId: category.id,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });

    if (childCategory) {
      throw new BadRequestException('Không thể xóa danh mục đang có danh mục con');
    }

    const product = await this.prisma.product.findFirst({
      where: {
        categoryId: category.id,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });

    if (product) {
      throw new BadRequestException('Không thể xóa danh mục đang có sản phẩm');
    }

    const deletedCategory = await this.prisma.category.update({
      where: {
        id: category.id,
      },
      data: {
        status: DefaultStatus.DELETED,
      },
      include: {
        parent: true,
      },
    });

    return {
      data: this.toOutput(deletedCategory),
      code: 0,
      message: 'Delete category success',
    };
  }
}
