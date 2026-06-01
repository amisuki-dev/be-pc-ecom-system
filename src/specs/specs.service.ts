import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateSpecDto } from './dto/create-spec.dto';
import { UpdateSpecDto } from './dto/update-spec.dto';
import { PrismaService } from 'src/prisma.service';
import { Prisma, DefaultStatus } from '@prisma/client';
import { parsePagination } from 'src/common/utils/pagination';
import { DefaultSpecOutputDto } from './dto/default-spec-output.dto';
import { plainToInstance } from 'class-transformer';

type SpecWithRelations = Prisma.SpecsGetPayload<{}>;

@Injectable()
export class SpecsService {
  constructor(private prisma: PrismaService) {}

  private toOutput(spec: SpecWithRelations) {
    return plainToInstance(DefaultSpecOutputDto, spec, { excludeExtraneousValues: true });
  }

  private async findActiveByCode(code: string) {
    return this.prisma.specs.findFirst({ where: { code, NOT: { status: DefaultStatus.DELETED } } });
  }

  async create(createSpecDto: CreateSpecDto) {
    const { code, name, unit, status } = createSpecDto;

    if (code) {
      const exist = await this.findActiveByCode(code);
      if (exist) throw new BadRequestException('Mã thông số đã tồn tại');
    }

    const data: Prisma.SpecsCreateInput = {
      code: code || undefined,
      name,
      unit,
      status: status || DefaultStatus.INACTIVE,
    };

    const created = await this.prisma.specs.create({ data });

    return { data: this.toOutput(created), code: 0, message: 'Create spec success' };
  }

  async findAll(query: any) {
    const { name, code, status, fromDate, toDate } = query;
    const { page, limit } = parsePagination(query.page, query.limit);

    const where: Prisma.SpecsWhereInput = {};
    if (name) where.name = { contains: name } as any;
    if (code) where.code = code as any;
    where.status = status || ({ not: DefaultStatus.DELETED } as any);

    if (fromDate && toDate)
      where.createdAt = { gte: new Date(fromDate), lte: new Date(toDate) } as any;

    const items = await this.prisma.specs.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    });
    const total = await this.prisma.specs.count({ where });

    return {
      data: items.map((i) => this.toOutput(i)),
      pagination: { page, limit, total },
      code: 0,
      message: 'Get list spec success',
    };
  }

  async findOne(code: string) {
    const spec = await this.prisma.specs.findFirst({
      where: { code, NOT: { status: DefaultStatus.DELETED } },
    });
    if (!spec) throw new NotFoundException('Không tìm thấy thông số');
    return { data: this.toOutput(spec), code: 0, message: 'Get spec success' };
  }

  async update(code: string, updateSpecDto: UpdateSpecDto) {
    if (!code) throw new BadRequestException('Code là bắt buộc');

    const spec = await this.findActiveByCode(code);
    if (!spec) throw new NotFoundException('Không tìm thấy thông số');

    const { name, unit, status, code: newCode } = updateSpecDto as any;

    const data: Prisma.SpecsUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (unit !== undefined) data.unit = unit;
    if (status !== undefined) data.status = status;

    if (newCode !== undefined && newCode !== code) {
      const exist = await this.findActiveByCode(newCode);
      if (exist && exist.id !== spec.id) throw new BadRequestException('Mã thông số đã tồn tại');
      data.code = newCode as any;
    }

    const updated = await this.prisma.specs.update({ where: { id: spec.id }, data });

    return { data: this.toOutput(updated), code: 0, message: 'Update spec success' };
  }

  async remove(code: string) {
    if (!code) throw new BadRequestException('Code là bắt buộc');

    const spec = await this.findActiveByCode(code);
    if (!spec) throw new NotFoundException('Không tìm thấy thông số');

    const deleted = await this.prisma.specs.update({
      where: { id: spec.id },
      data: { status: DefaultStatus.DELETED },
    });

    return { data: this.toOutput(deleted), code: 0, message: 'Delete spec success' };
  }
}
