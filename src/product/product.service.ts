import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from 'src/prisma.service';
import { randomUUID } from 'node:crypto';
import { DefaultStatus, Prisma } from '@prisma/client';
import { DefaultProductOutputDto } from './dto/default-product-output.dto';
import { plainToInstance } from 'class-transformer';

type ProductWithParent = Prisma.ProductGetPayload<{
  include: {
    category: true;
    brand: true;
  };
}>;

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    return randomUUID();
  }

  private toOutput(product: ProductWithParent) {
    return plainToInstance(
      DefaultProductOutputDto,
      {
        ...product,
        category: product.category
          ? {
              name: product.category.name,
              code: product.category.code,
              status: product.category.status,
            }
          : null,
        brand: product.brand
          ? {
              name: product.brand.name,
              code: product.brand.code,
              status: product.brand.status,
            }
          : null,
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }

  private async findActiveProductByCode(code: string) {
    return this.prisma.product.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
  }

  private async getActiveProductByCode(code: string) {
    const product = await this.findActiveProductByCode(code);

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return product;
  }

  async create(createProductDto: CreateProductDto) {
    const { code, status, name, categoryCode, brandCode } = createProductDto;

    if (code) {
      const findExistProduct = await this.findActiveProductByCode(code);

      if (findExistProduct) {
        throw new BadRequestException('Mã sản phẩm đã tồn tại');
      }
    }

    const categoryInfo = await this.prisma.category.findFirst({
      where: {
        code: categoryCode,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
    if (!categoryInfo) {
      throw new BadRequestException('Không tìm thấy mã danh mục, vui lòng thử lại');
    }

    const brandInfo = await this.prisma.brand.findFirst({
      where: {
        code: brandCode,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
    if (!brandInfo) {
      throw new BadRequestException('Không tìm thấy mã nhãn hàng, vui lòng thử lại');
    }

    const data: Prisma.ProductCreateInput = {
      code: code || this.generateCode(),
      status: status || DefaultStatus.INACTIVE,
      name,
      category: {
        connect: {
          id: categoryInfo.id,
        },
      },
      brand: {
        connect: {
          id: brandInfo.id,
        },
      },
    };

    const createdProduct = await this.prisma.product.create({
      data: data,
      include: {
        brand: true,
        category: true,
      },
    });

    return {
      data: this.toOutput(createdProduct),
      code: 0,
      message: 'Create product success',
    };
  }

  async findAll(query: import('./dto/find-product-query.dto').FindProductQueryDto) {
    const {
      name,
      code,
      status,
      categoryCode,
      brandCode,
      fromDate,
      toDate,
      page = 0,
      limit = 10,
    } = query;
    const normalizedPage = Number(page);
    const normalizedLimit = Number(limit);

    if (!Number.isInteger(normalizedPage) || normalizedPage < 0) {
      throw new BadRequestException('Page phải là số nguyên không âm');
    }

    if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1) {
      throw new BadRequestException('Limit phải là số nguyên lớn hơn 0');
    }

    const where: Prisma.ProductWhereInput = {};

    if (name) {
      where.name = { contains: name };
    }

    if (code) {
      where.code = code;
    }

    where.status = status || { not: DefaultStatus.DELETED };

    if (categoryCode) {
      const category = await this.prisma.category.findFirst({
        where: { code: categoryCode, NOT: { status: DefaultStatus.DELETED } },
      });
      if (!category) {
        throw new BadRequestException('Không tìm thấy mã danh mục');
      }
      where.categoryId = category.id;
    }

    if (brandCode) {
      const brand = await this.prisma.brand.findFirst({
        where: { code: brandCode, NOT: { status: DefaultStatus.DELETED } },
      });
      if (!brand) {
        throw new BadRequestException('Không tìm thấy mã nhãn hàng');
      }
      where.brandId = brand.id;
    }

    if (fromDate && toDate) {
      where.createdAt = {
        gte: new Date(fromDate),
        lte: new Date(toDate),
      };
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: normalizedPage * normalizedLimit,
      take: normalizedLimit,
    });

    const total = await this.prisma.product.count({ where });

    return {
      data: products.map((product) => this.toOutput(product)),
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
      },
      code: 0,
      message: 'Get list product success',
    };
  }

  async findOne(code: string) {
    const productInfo = await this.prisma.product.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
      include: {
        brand: true,
        category: true,
      },
    });

    if (!productInfo) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    return {
      data: this.toOutput(productInfo),
      code: 0,
      message: 'Get product success',
    };
  }

  async update(code: string, updateProductDto: UpdateProductDto) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const product = await this.getActiveProductByCode(code);
    const { name, code: newCode, status, categoryCode, brandCode } = updateProductDto;
    const data: Prisma.ProductUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (status !== undefined) {
      data.status = status;
    }

    if (newCode !== undefined && newCode !== code) {
      const existProduct = await this.findActiveProductByCode(newCode);

      if (existProduct && existProduct.id !== product.id) {
        throw new BadRequestException('Mã sản phẩm đã tồn tại');
      }

      data.code = newCode;
    }

    if (categoryCode !== undefined) {
      const categoryInfo = await this.prisma.category.findFirst({
        where: {
          code: categoryCode,
          NOT: {
            status: DefaultStatus.DELETED,
          },
        },
      });

      if (!categoryInfo) {
        throw new BadRequestException('Không tìm thấy mã danh mục, vui lòng thử lại');
      }

      data.category = {
        connect: {
          id: categoryInfo.id,
        },
      };
    }

    if (brandCode !== undefined) {
      const brandInfo = await this.prisma.brand.findFirst({
        where: {
          code: brandCode,
          NOT: {
            status: DefaultStatus.DELETED,
          },
        },
      });

      if (!brandInfo) {
        throw new BadRequestException('Không tìm thấy mã nhãn hàng, vui lòng thử lại');
      }

      data.brand = {
        connect: {
          id: brandInfo.id,
        },
      };
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: product.id },
      data,
      include: {
        brand: true,
        category: true,
      },
    });

    return {
      data: this.toOutput(updatedProduct),
      code: 0,
      message: 'Update product success',
    };
  }

  async remove(code: string) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const product = await this.getActiveProductByCode(code);

    const deletedProduct = await this.prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        status: DefaultStatus.DELETED,
      },
      include: {
        brand: true,
        category: true,
      },
    });

    return {
      data: this.toOutput(deletedProduct),
      code: 0,
      message: 'Delete product success',
    };
  }
}
