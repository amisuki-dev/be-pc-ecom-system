import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductspecDto } from './dto/create-productspec.dto';
import { UpdateProductspecDto } from './dto/update-productspec.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma, DefaultStatus } from '@prisma/client';
import { parsePagination } from 'src/common/utils/pagination';
import { DefaultProductspecOutputDto } from './dto/default-productspec-output.dto';
import { plainToInstance } from 'class-transformer';

type ProductspecWithParent = Prisma.ProductSpecsGetPayload<{
  include: { product: true; specs: true };
}>;

@Injectable()
export class ProductspecsService {
  constructor(private prisma: PrismaService) {}

  private toOutput(spec: ProductspecWithParent) {
    return plainToInstance(
      DefaultProductspecOutputDto,
      {
        ...spec,
        product: spec.product
          ? { name: spec.product.name, code: spec.product.code, status: spec.product.status }
          : null,
        specs: spec.specs
          ? {
              name: spec.specs.name,
              code: spec.specs.code,
              unit: spec.specs.unit,
              status: spec.specs.status,
            }
          : null,
      },
      { excludeExtraneousValues: true },
    );
  }

  private async getActiveById(id: string) {
    const spec = await this.prisma.productSpecs.findFirst({
      where: { id, NOT: { status: DefaultStatus.DELETED } },
    });

    if (!spec) {
      throw new NotFoundException('Không tìm thấy thông tin');
    }

    return spec;
  }

  async create(createProductspecDto: CreateProductspecDto) {
    const { productCode, specsCode, value, status } = createProductspecDto;

    const product = await this.prisma.product.findFirst({
      where: { code: productCode, NOT: { status: DefaultStatus.DELETED } },
    });

    if (!product) {
      throw new BadRequestException('Không tìm thấy mã sản phẩm');
    }

    const specs = await this.prisma.specs.findFirst({
      where: { code: specsCode, NOT: { status: DefaultStatus.DELETED } },
    });

    if (!specs) {
      throw new BadRequestException('Không tìm thấy mã thông số');
    }

    const data: Prisma.ProductSpecsCreateInput = {
      value,
      status: status || DefaultStatus.ACTIVE,
      product: { connect: { id: product.id } },
      specs: { connect: { id: specs.id } },
    };

    const created = await this.prisma.productSpecs.create({
      data,
      include: { product: true, specs: true },
    });

    return { data: this.toOutput(created), code: 0, message: 'Create productspec success' };
  }

  async findAll(query: any) {
    const { productCode, specsCode, value, status, fromDate, toDate } = query;
    const { page, limit } = parsePagination(query.page, query.limit);

    const where: Prisma.ProductSpecsWhereInput = {};

    if (value) {
      where.value = { contains: value } as any;
    }

    where.status = status || { not: DefaultStatus.DELETED };

    if (productCode) {
      const product = await this.prisma.product.findFirst({
        where: { code: productCode, NOT: { status: DefaultStatus.DELETED } },
      });
      if (!product) throw new BadRequestException('Không tìm thấy mã sản phẩm');
      where.productId = product.id;
    }

    if (specsCode) {
      const specs = await this.prisma.specs.findFirst({
        where: { code: specsCode, NOT: { status: DefaultStatus.DELETED } },
      });
      if (!specs) throw new BadRequestException('Không tìm thấy mã thông số');
      where.specsId = specs.id;
    }

    if (fromDate && toDate) {
      where.createdAt = { gte: new Date(fromDate), lte: new Date(toDate) } as any;
    }

    const items = await this.prisma.productSpecs.findMany({
      where,
      include: { product: true, specs: true },
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });

    const total = await this.prisma.productSpecs.count({ where });

    return {
      data: items.map((i) => this.toOutput(i)),
      pagination: { page, limit, total },
      code: 0,
      message: 'Get list productspec success',
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.productSpecs.findFirst({
      where: { id, NOT: { status: DefaultStatus.DELETED } },
      include: { product: true, specs: true },
    });

    if (!item) throw new NotFoundException('Không tìm thấy sản phẩm thông số');

    return { data: this.toOutput(item), code: 0, message: 'Get productspec success' };
  }

  async update(id: string, updateProductspecDto: UpdateProductspecDto) {
    if (!id) throw new BadRequestException('Id là bắt buộc');

    const exist = await this.getActiveById(id);

    const { value, status, productCode, specsCode } = updateProductspecDto as any;

    const data: Prisma.ProductSpecsUpdateInput = {};

    if (value !== undefined) data.value = value;
    if (status !== undefined) data.status = status;

    if (productCode !== undefined) {
      const product = await this.prisma.product.findFirst({
        where: { code: productCode, NOT: { status: DefaultStatus.DELETED } },
      });
      if (!product) throw new BadRequestException('Không tìm thấy mã sản phẩm');
      data.product = { connect: { id: product.id } } as any;
    }

    if (specsCode !== undefined) {
      const specs = await this.prisma.specs.findFirst({
        where: { code: specsCode, NOT: { status: DefaultStatus.DELETED } },
      });
      if (!specs) throw new BadRequestException('Không tìm thấy mã thông số');
      data.specs = { connect: { id: specs.id } } as any;
    }

    const updated = await this.prisma.productSpecs.update({
      where: { id: exist.id },
      data,
      include: { product: true, specs: true },
    });

    return { data: this.toOutput(updated), code: 0, message: 'Update productspec success' };
  }

  async remove(id: string) {
    if (!id) throw new BadRequestException('Id là bắt buộc');

    const exist = await this.getActiveById(id);

    const deleted = await this.prisma.productSpecs.update({
      where: { id: exist.id },
      data: { status: DefaultStatus.DELETED },
      include: { product: true, specs: true },
    });

    return { data: this.toOutput(deleted), code: 0, message: 'Delete productspec success' };
  }
}
