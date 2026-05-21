import { Exclude, Expose, Type } from 'class-transformer';

export class CategoryParentOutputDto {
  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  status: string;
}

export class DefaultCategoryOutputDto {
  @Exclude()
  id: string;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  status: string;

  @Expose()
  @Type(() => CategoryParentOutputDto)
  parentInfo: CategoryParentOutputDto | null;
}
