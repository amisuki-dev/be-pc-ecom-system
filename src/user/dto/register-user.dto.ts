import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsNotEmpty({ message: 'Tài khoản không được trống' })
  username: string;
  @IsNotEmpty({ message: 'Mật khẩu không được trống' })
  @MinLength(8, { message: 'Mật khẩu phải lớn hơn 8 ký tự' })
  @MaxLength(16, { message: 'Mật khẩu phải nhỏ hơn 16 ký tự' })
  password: string;
  @IsNotEmpty({ message: 'Nhập lại mật khẩu không được trống' })
  @MinLength(8, { message: 'Nhập lại mật khẩu phải lớn hơn 8 ký tự' })
  @MaxLength(16, { message: 'Nhập lại mật khẩu phải nhỏ hơn 16 ký tự' })
  retypePassword: string;
  @IsEmail()
  email: string;

  displayName: string;
}
