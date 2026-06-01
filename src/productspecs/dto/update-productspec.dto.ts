import { PartialType } from '@nestjs/mapped-types';
import { CreateProductspecDto } from './create-productspec.dto';

export class UpdateProductspecDto extends PartialType(CreateProductspecDto) {}
