import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { BrandService } from './brand.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { FindBrandQueryDto } from './dto/find-brand-query.dto';

@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  create(@Body() createBrandDto: CreateBrandDto) {
    return this.brandService.create(createBrandDto);
  }

  @Get()
  findAll(@Query() query: FindBrandQueryDto) {
    return this.brandService.findAll(query);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.brandService.findOne(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() updateBrandDto: UpdateBrandDto) {
    return this.brandService.update(code, updateBrandDto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.brandService.remove(code);
  }
}
