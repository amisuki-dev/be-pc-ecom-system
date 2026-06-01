import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FindProductQueryDto } from './dto/find-product-query.dto';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  findAll(@Query() query: FindProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.productService.findOne(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(code, updateProductDto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.productService.remove(code);
  }
}
