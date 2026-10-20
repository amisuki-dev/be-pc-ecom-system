import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { CurrentUserType } from '../auth/interfaces/current-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FindUserQueryDto } from './dto/find-user-query.dto';
import { Public } from '../auth/decorators/public.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Post('register')
  register(@Body() registerUserDto: RegisterUserDto) {
    return this.userService.register(registerUserDto);
  }

  @Public()
  @Post('login')
  login(@Body() loginUserDto: LoginUserDto) {
    return this.userService.login(loginUserDto);
  }

  @UseGuards(PermissionGuard)
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get('info')
  info(@CurrentUser() user: CurrentUserType) {
    return this.userService.info(user);
  }

  @UseGuards(PermissionGuard)
  @Get()
  findAll(@Query() query: FindUserQueryDto = {} as FindUserQueryDto) {
    return this.userService.findAll(query);
  }

  @UseGuards(PermissionGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @UseGuards(PermissionGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @UseGuards(PermissionGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
