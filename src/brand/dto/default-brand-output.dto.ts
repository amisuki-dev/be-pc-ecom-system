import { Exclude, Expose } from 'class-transformer';

export class DefaultBrandOutputDto {
  @Exclude()
  id: string;

  @Expose()
  name: string;

  @Expose()
  code: string;

  @Expose()
  status: string;
}
