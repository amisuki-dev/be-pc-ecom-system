import { BadRequestException } from '@nestjs/common';

export function parsePagination(pageInput: any, limitInput: any) {
  const page = Number(pageInput ?? 0);
  const limit = Number(limitInput ?? 10);

  if (!Number.isInteger(page) || page < 0) {
    throw new BadRequestException('Page phải là số nguyên không âm');
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new BadRequestException('Limit phải là số nguyên lớn hơn 0');
  }

  return { page, limit };
}
