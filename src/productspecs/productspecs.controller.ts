import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProductspecsService } from './productspecs.service';
import { CreateProductspecDto } from './dto/create-productspec.dto';
import { UpdateProductspecDto } from './dto/update-productspec.dto';
import { FindProductspecQueryDto } from './dto/find-productspec-query.dto';

@Controller('productspecs')
export class ProductspecsController {
  constructor(private readonly productspecsService: ProductspecsService) {}

  @Post()
  create(@Body() createProductspecDto: CreateProductspecDto) {
    return this.productspecsService.create(createProductspecDto);
  }

  @Get()
  findAll(@Query() query: FindProductspecQueryDto) {
    return this.productspecsService.findAll(query);
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productspecsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductspecDto: UpdateProductspecDto) {
    return this.productspecsService.update(id, updateProductspecDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productspecsService.remove(id);
  }
}
