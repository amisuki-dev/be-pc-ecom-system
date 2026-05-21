import { Exclude, Expose, Type } from 'class-transformer';

export class ProductRelationOutputDto {
  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  status: string;
}

export class DefaultProductOutputDto {
  @Exclude()
  id: string;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  status: string;

  @Expose()
  @Type(() => ProductRelationOutputDto)
  category: ProductRelationOutputDto | null;

  @Expose()
  @Type(() => ProductRelationOutputDto)
  brand: ProductRelationOutputDto | null;
}
