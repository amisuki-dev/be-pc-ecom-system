import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/user/user.service';

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, PrismaService, UserService],
})
export class CategoryModule {}
