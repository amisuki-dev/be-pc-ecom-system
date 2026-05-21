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

    return this.toOutput(createdCategory);
  }

  async findAll(query: FindCategoryQueryDto) {
    const { name, code, status, parentCode, fromDate, toDate } = query;
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
    });

    return categories.map((category) => this.toOutput(category));
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

    return this.toOutput(categoryInfo);
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

    return this.toOutput(updatedCategory);
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

    return this.toOutput(deletedCategory);
  }
}
