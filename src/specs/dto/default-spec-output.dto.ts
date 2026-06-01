import { Expose } from 'class-transformer';
import { DefaultStatus } from '@prisma/client';

export class DefaultSpecOutputDto {
  @Expose()
  id: string;

  @Expose()
  code: string;

  @Expose()
  name: string;

  @Expose()
  unit: string;

  @Expose()
  status: DefaultStatus;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
