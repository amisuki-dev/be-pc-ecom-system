import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth/jwt-auth.guard';
import { FindCategoryQueryDto } from './dto/find-category-query.dto';

@Controller('category')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  findAll(@Query() query: FindCategoryQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.categoryService.findOne(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoryService.update(code, updateCategoryDto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.categoryService.remove(code);
  }
}
