import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { DefaultStatus, Brand, Prisma } from '@prisma/client';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { nanoid } from 'nanoid';
import { plainToInstance } from 'class-transformer';
import { DefaultBrandOutputDto } from './dto/default-brand-output.dto';
import { FindBrandQueryDto } from './dto/find-brand-query.dto';
import dayjs from 'dayjs';

@Injectable()
export class BrandService {
  constructor(private prisma: PrismaService) {}

  private toOutput(brand: Brand) {
    return plainToInstance(DefaultBrandOutputDto, brand, {
      excludeExtraneousValues: true,
    });
  }

  private async findActiveBrandByCode(code: string) {
    return this.prisma.brand.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
  }

  private async getActiveBrandByCode(code: string) {
    const brand = await this.findActiveBrandByCode(code);

    if (!brand) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    return brand;
  }

  private async syncProductsToBrand(
    prismaClient: Prisma.TransactionClient,
    productCodes: string[] | undefined,
    brandId: string,
  ) {
    if (!productCodes?.length) {
      return;
    }

    const uniqueCodes = [...new Set(productCodes)];

    const products = await prismaClient.product.findMany({
      where: {
        code: {
          in: uniqueCodes,
        },
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
      select: {
        id: true,
      },
    });

    if (!products.length) {
      return;
    }

    await prismaClient.product.updateMany({
      where: {
        id: {
          in: products.map((product) => product.id),
        },
      },
      data: {
        brandId,
      },
    });
  }

  async create(createBrandDto: CreateBrandDto) {
    const { name, code, status, products } = createBrandDto;

    const data: Prisma.BrandCreateInput = {
      name,
      status: status || DefaultStatus.INACTIVE,
      code: code || nanoid(),
    };

    const findExistBrand = await this.findActiveBrandByCode(data.code);

    if (findExistBrand) {
      throw new BadRequestException('Mã thương hiệu đã tồn tại');
    }

    const createdBrand = await this.prisma.$transaction(async (transaction) => {
      const brand = await transaction.brand.create({
        data,
      });

      await this.syncProductsToBrand(transaction, products, brand.id);

      return brand;
    });

    return {
      data: this.toOutput(createdBrand),
      code: 0,
      message: 'Create brand success',
    };
  }

  async findAll(query: FindBrandQueryDto) {
    const { name, code, status, startDate, endDate, page = 0, limit = 10 } = query;
    const normalizedPage = Number(page);
    const normalizedLimit = Number(limit);

    if (!Number.isInteger(normalizedPage) || normalizedPage < 0) {
      throw new BadRequestException('Page phải là số nguyên không âm');
    }

    if (!Number.isInteger(normalizedLimit) || normalizedLimit < 1) {
      throw new BadRequestException('Limit phải là số nguyên lớn hơn 0');
    }

    const where: Prisma.BrandWhereInput = {};

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

    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate ? { gte: dayjs(startDate).startOf('day').toDate() } : {}),
        ...(endDate ? { lte: dayjs(endDate).endOf('day').toDate() } : {}),
      };
    }

    const brands = await this.prisma.brand.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip: normalizedPage * normalizedLimit,
      take: normalizedLimit,
    });
    const total = await this.prisma.brand.count({ where });

    return {
      data: brands.map((brand) => this.toOutput(brand)),
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
      },
      code: 0,
      message: 'Get list brand success',
    };
  }

  async findOne(code: string) {
    const brandInfo = await this.prisma.brand.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });

    if (!brandInfo) {
      throw new NotFoundException('Không tìm thấy thương hiệu');
    }

    return {
      data: this.toOutput(brandInfo),
      code: 0,
      message: 'Get brand success',
    };
  }

  async update(code: string, updateBrandDto: UpdateBrandDto) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const brand = await this.getActiveBrandByCode(code);
    const { name, code: newCode, status, products } = updateBrandDto;
    const data: Prisma.BrandUpdateInput = {};

    if (name !== undefined) {
      data.name = name;
    }

    if (status !== undefined) {
      data.status = status;
    }

    if (newCode !== undefined && newCode !== code) {
      const existBrand = await this.findActiveBrandByCode(newCode);

      if (existBrand && existBrand.id !== brand.id) {
        throw new BadRequestException('Mã thương hiệu đã tồn tại');
      }

      data.code = newCode;
    }

    const updatedBrand = await this.prisma.$transaction(async (transaction) => {
      const brandRecord = await transaction.brand.update({
        where: {
          id: brand.id,
        },
        data,
      });

      await this.syncProductsToBrand(transaction, products, brandRecord.id);

      return brandRecord;
    });

    return {
      data: this.toOutput(updatedBrand),
      code: 0,
      message: 'Update brand success',
    };
  }

  async remove(code: string) {
    if (!code) {
      throw new BadRequestException('Mã Code là bắt buộc');
    }

    const brand = await this.getActiveBrandByCode(code);

    const product = await this.prisma.product.findFirst({
      where: {
        brandId: brand.id,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });

    if (product) {
      throw new BadRequestException('Không thể xóa thương hiệu đang có sản phẩm');
    }

    const deletedBrand = await this.prisma.brand.update({
      where: {
        id: brand.id,
      },
      data: {
        status: DefaultStatus.DELETED,
      },
    });

    return {
      data: this.toOutput(deletedBrand),
      code: 0,
      message: 'Delete brand success',
    };
  }
}
