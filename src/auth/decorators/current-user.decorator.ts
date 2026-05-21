import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserType } from '../interfaces/current-user.interface';

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserType | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: CurrentUserType = request.user;

    if (!user) return null;

    // 👇 nếu truyền field → lấy field
    return data ? user[data] : user;
  },
);
