import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { DbModule } from './db/db.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { BrandModule } from './brand/brand.module';
import { SpecsModule } from './specs/specs.module';
import { ProductspecsModule } from './productspecs/productspecs.module';
import { RoleModule } from './role/role.module';
import { PermissionModule } from './permission/permission.module';

@Module({
  imports: [
    UserModule,
    DbModule,
    ConfigModule.forRoot(),
    AuthModule,
    CategoryModule,
    ProductModule,
    BrandModule,
    SpecsModule,
    ProductspecsModule,
    RoleModule,
    PermissionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
