import { Expose } from 'class-transformer';
import { DefaultStatus } from '@prisma/client';

export class DefaultProductspecOutputDto {
  @Expose()
  id: string;

  @Expose()
  value: string;

  @Expose()
  status: DefaultStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  product: {
    name: string;
    code: string;
    status: DefaultStatus;
  } | null;

  @Expose()
  specs: {
    name: string;
    code: string;
    unit: string;
    status: DefaultStatus;
  } | null;
}
