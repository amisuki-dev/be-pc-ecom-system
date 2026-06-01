import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { SpecsService } from './specs.service';
import { CreateSpecDto } from './dto/create-spec.dto';
import { UpdateSpecDto } from './dto/update-spec.dto';
import { FindSpecQueryDto } from './dto/find-spec-query.dto';

@Controller('specs')
export class SpecsController {
  constructor(private readonly specsService: SpecsService) {}

  @Post()
  create(@Body() createSpecDto: CreateSpecDto) {
    return this.specsService.create(createSpecDto);
  }

  @Get()
  findAll(@Query() query: FindSpecQueryDto) {
    return this.specsService.findAll(query);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.specsService.findOne(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() updateSpecDto: UpdateSpecDto) {
    return this.specsService.update(code, updateSpecDto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.specsService.remove(code);
  }
}
