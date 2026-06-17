import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleQueryDto } from './dto/role-query.dto';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  findAll(@Query() roleQueryDto: RoleQueryDto) {
    return this.roleService.findAll(roleQueryDto);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.roleService.findOne(code);
  }

  @Patch(':code')
  update(@Param('code') code: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.roleService.update(code, updateRoleDto);
  }

  @Delete(':code')
  remove(@Param('code') code: string) {
    return this.roleService.remove(code);
  }
}
