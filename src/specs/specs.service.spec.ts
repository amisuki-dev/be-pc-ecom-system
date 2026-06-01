import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { SpecsService } from './specs.service';

describe('SpecsService', () => {
  let service: SpecsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpecsService,
        {
          provide: PrismaService,
          useValue: {
            specs: {},
          },
        },
      ],
    }).compile();

    service = module.get<SpecsService>(SpecsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
