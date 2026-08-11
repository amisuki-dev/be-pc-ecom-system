import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { UserService } from './user.service';
import { BadRequestException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';

jest.mock('jsonwebtoken');
jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
            },
            role: {},
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);

    process.env.REFRESH_TOKEN_EXPIRES_IN = '3600';
    process.env.AUDIENCE = 'test-aud';
    process.env.SUBJECT = 'test-sub';
    process.env.SECRET_KEY = 'test-secret';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw BadRequestException if jwt.sign throws an error', async () => {
      const loginDto = { identifier: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        status: 'ACTIVE',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('jwt error');
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('Tạo token Lỗi'),
      );
    });

    it('should login successfully', async () => {
      const loginDto = { identifier: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        password: 'hashed-password',
        status: 'ACTIVE',
        username: 'testuser',
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
      (jwt.sign as jest.Mock).mockReturnValue('mocked-token');

      const result = await service.login(loginDto);

      expect(result.code).toBe(0);
      expect(result.message).toBe('Đăng nhập thành công');
      expect(result.data.tokenInfo.token).toBe('mocked-token');
    });
  });
});
