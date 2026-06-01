import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ProductspecsService } from './productspecs.service';
import { describe, beforeEach, it } from 'node:test';

describe('ProductspecsService', () => {
  let service: ProductspecsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductspecsService,
        {
          provide: PrismaService,
          useValue: {
            productSpecs: {},
            product: {},
            specs: {},
          },
        },
      ],
    }).compile();

    service = module.get<ProductspecsService>(ProductspecsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
