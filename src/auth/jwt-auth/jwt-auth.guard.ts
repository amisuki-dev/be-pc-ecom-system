import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../../user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing token');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded: any = jwt.verify(token, process.env.SECRET_KEY);

      const user = await this.userService.findActiveById(decoded.uid);

      if (!user || user.status === 'DELETED') {
        throw new UnauthorizedException('User không hợp lệ');
      }
      if (user.status === 'INACTIVE') {
        throw new UnauthorizedException('User chưa kích hoạt');
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token hết hạn');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      if (error instanceof Error) {
        throw new UnauthorizedException(error.message);
      }

      throw new UnauthorizedException('Unauthorized');
    }
  }
}
