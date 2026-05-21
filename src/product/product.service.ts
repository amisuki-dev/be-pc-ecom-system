import { BadRequestException, Injectable } from '@nestjs/common';
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
  async create(createProductDto: CreateProductDto) {
    const { code, status, name, categoryCode, brandCode } = createProductDto;
    if (code) {
      const findExistProduct = await this.prisma.product.findFirst({
        where: {
          code,
          NOT: {
            status: DefaultStatus.DELETED,
          },
        },
      });
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

    return this.toOutput(createdProduct);
  }

  findAll() {
    return `This action returns all product`;
  }

  findOne(id: number) {
    return `This action returns a #${id} product`;
  }

  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  remove(id: number) {
    return `This action removes a #${id} product`;
  }
}
