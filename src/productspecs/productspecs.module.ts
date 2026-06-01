import { Module } from '@nestjs/common';
import { ProductspecsService } from './productspecs.service';
import { ProductspecsController } from './productspecs.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  controllers: [ProductspecsController],
  providers: [ProductspecsService, PrismaService],
})
export class ProductspecsModule {}
