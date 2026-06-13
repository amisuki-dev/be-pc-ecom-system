import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { DefaultUserOutputDto, TokenInfo } from './dto/default-user-output.dto';
import { FindUserQueryDto } from './dto/find-user-query.dto';
import { PrismaService } from '../prisma.service';
import { DefaultStatus, Prisma, UserStatus } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { LoginUserDto } from './dto/login-user.dto';
import { CurrentUserType } from '../auth/interfaces/current-user.interface';
import { parsePagination } from '../common/utils/pagination';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  private async isEmailExist(email: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { email, NOT: { status: UserStatus.DELETED } },
    });
    return Boolean(user);
  }

  private async isUserNameExist(username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { username, NOT: { status: UserStatus.DELETED } },
    });
    return Boolean(user);
  }

  private validPassword(password: string, userPassword: string): boolean {
    return bcrypt.compareSync(password, userPassword);
  }

  private generateToken(id: string): TokenInfo {
    const ttl = process.env.REFRESH_TOKEN_EXPIRES_IN;
    const ttlSeconds = Number(ttl);

    if (!ttl || Number.isNaN(ttlSeconds)) {
      throw new BadRequestException('Cấu hình token không hợp lệ');
    }

    try {
      const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
      const token = jwt.sign(
        {
          jti: randomUUID(),
          aud: process.env.AUDIENCE,
          sub: process.env.SUBJECT,
          uid: id,
          exp,
        },
        process.env.SECRET_KEY ?? '',
      );

      return {
        token,
        ttl,
        created: new Date(),
        exp,
      };
    } catch {
      throw new BadRequestException('Tạo token Lỗi');
    }
  }

  private async getDefaultRole() {
    return this.prisma.role.findFirst({
      where: {
        code: 'user',
      },
    });
  }

  private async findActiveRoleByCode(code: string) {
    return this.prisma.role.findFirst({
      where: {
        code,
        NOT: {
          status: DefaultStatus.DELETED,
        },
      },
    });
  }

  private async getActiveUserById(id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        NOT: {
          status: UserStatus.DELETED,
        },
      },
    });
  }

  async findActiveById(id: string) {
    return this.getActiveUserById(id);
  }

  private toOutput<T extends object>(data: T) {
    return plainToInstance(DefaultUserOutputDto, data, {
      excludeExtraneousValues: true,
    });
  }

  async register(registerUserDto: RegisterUserDto) {
    const { email, username, password, retypePassword, displayName } = registerUserDto;
    const normalizedDisplayName = displayName || username;

    if (password !== retypePassword) {
      throw new BadRequestException('Mật khẩu và nhập lại mật khẩu không trùng khớp');
    }

    const [roleUser, isExistEmail, isExistUserName] = await Promise.all([
      this.getDefaultRole(),
      this.isEmailExist(email),
      this.isUserNameExist(username),
    ]);

    if (!roleUser) {
      throw new BadRequestException('Lỗi hệ thống Role. Vui lòng thử lại sau');
    }

    if (isExistEmail) {
      throw new BadRequestException(`Email đã tồn tại: ${email}. Vui lòng sử dụng email khác.`);
    }

    if (isExistUserName) {
      throw new BadRequestException(
        `Tài khoản đã tồn tại: ${username}. Vui lòng sử dụng tài khoản khác.`,
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await this.prisma.user.create({
      data: {
        code: randomUUID().replace(/-/g, '').slice(0, 10),
        email,
        username,
        password: hashedPassword,
        displayName: normalizedDisplayName,
        role: {
          connect: { id: roleUser.id },
        },
      },
    });

    if (!createdUser) {
      throw new BadRequestException('Tạo tài khoản thất bại');
    }

    return {
      data: this.toOutput({
        ...createdUser,
        tokenInfo: this.generateToken(createdUser.id),
      }),
      code: 0,
      message: 'Create user success',
    };
  }

  async login(loginUserDto: LoginUserDto) {
    const { identifier, password } = loginUserDto;

    if (!identifier) {
      throw new BadRequestException(
        'Thiếu thông tin đăng nhập, vui lòng nhập email hoặc tài khoản để tiếp tục',
      );
    }
    if (!password) {
      throw new BadRequestException('Thiếu thông tin mật khẩu vui lòng thử lại');
    }

    const userInfo = await this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: identifier,
          },
          { username: identifier },
        ],
        NOT: { status: UserStatus.DELETED },
      },
    });

    if (!userInfo) {
      throw new BadRequestException('Không tìm thấy tài khoản.');
    }
    if (userInfo.status === 'INACTIVE') {
      throw new BadRequestException('Tài khoản chưa được kích hoạt');
    }
    const userPassword = userInfo.password;
    const checkPassword = this.validPassword(password, userPassword);
    if (!checkPassword) {
      throw new BadRequestException('Sai mật khẩu. Vui lòng nhập lại mật khẩu');
    }

    return {
      data: this.toOutput({
        ...userInfo,
        tokenInfo: this.generateToken(userInfo.id),
      }),
      code: 0,
      message: 'Đăng nhập thành công',
    };
  }

  async create(createUserDto: CreateUserDto) {
    return this.register(createUserDto);
  }

  async findAll(query: FindUserQueryDto = {} as FindUserQueryDto): Promise<any> {
    const {
      code,
      username,
      displayName,
      email,
      status,
      roleCode,
      sort = 'createdAt',
      sortDirection = 'desc',
    } = query;
    const { page, limit } = parsePagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = {};

    if (code) {
      where.code = code;
    }

    if (username) {
      where.username = username;
    }

    if (displayName) {
      where.displayName = {
        contains: displayName,
      };
    }

    if (email) {
      where.email = email;
    }

    if (status) {
      where.status = status;
    } else {
      where.status = {
        not: UserStatus.DELETED,
      };
    }

    if (roleCode) {
      const role = await this.findActiveRoleByCode(roleCode);

      if (!role) {
        throw new BadRequestException(`Không tìm thấy mã role: ${roleCode}`);
      }

      where.roleId = role.id;
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: {
        [sort]: sortDirection,
      } as Prisma.UserOrderByWithRelationInput,
      skip: page * limit,
      take: limit,
    });
    const total = await this.prisma.user.count({ where });

    return {
      data: users.map((u) => this.toOutput(u)),
      pagination: {
        page,
        limit,
        total,
      },
      code: 0,
      message: 'Lấy danh sách khách hàng thành công',
    };
  }

  async getAll(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<any> {
    const { skip, take, cursor, where, orderBy } = params;
    const users = await this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });

    return {
      data: users.map((u) => this.toOutput(u)),
      code: 0,
      message: 'Get list user success',
    };
  }

  async findOne(id: string) {
    const userInfo = await this.getActiveUserById(id);

    if (!userInfo) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    return {
      data: this.toOutput(userInfo),
      code: 0,
      message: 'Get user success',
    };
  }

  async info(user: CurrentUserType) {
    return {
      data: this.toOutput(user),
      code: 0,
      message: 'Get info success',
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.getActiveUserById(id);

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    const data: Prisma.UserUpdateInput = {};
    const { displayName, email, username, password } = updateUserDto;

    if (displayName !== undefined) {
      data.displayName = displayName;
    }

    if (email !== undefined && email !== user.email) {
      const isExistEmail = await this.isEmailExist(email);

      if (isExistEmail) {
        throw new BadRequestException(`Email đã tồn tại: ${email}. Vui lòng sử dụng email khác.`);
      }

      data.email = email;
    }

    if (username !== undefined && username !== user.username) {
      const isExistUserName = await this.isUserNameExist(username);

      if (isExistUserName) {
        throw new BadRequestException(
          `Tài khoản đã tồn tại: ${username}. Vui lòng sử dụng tài khoản khác.`,
        );
      }

      data.username = username;
    }

    if (password !== undefined) {
      data.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data,
    });

    return {
      data: this.toOutput(updatedUser),
      code: 0,
      message: 'Update user success',
    };
  }

  async remove(id: string) {
    const user = await this.getActiveUserById(id);

    if (!user) {
      throw new NotFoundException('Không tìm thấy tài khoản.');
    }

    const deletedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.DELETED,
      },
    });

    return {
      data: this.toOutput(deletedUser),
      code: 0,
      message: 'Delete user success',
    };
  }
}
