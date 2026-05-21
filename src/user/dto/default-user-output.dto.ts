import { Exclude, Expose } from 'class-transformer';

export interface TokenInfo {
  token: string;
  ttl: string;
  created: Date;
  exp: number;
}

export class DefaultUserOutputDto {
  @Exclude()
  id: string;

  @Expose()
  email: string;

  @Expose()
  username: string;

  @Expose()
  displayName: string;

  @Expose()
  tokenInfo: TokenInfo;

  @Exclude()
  password: string;
}
