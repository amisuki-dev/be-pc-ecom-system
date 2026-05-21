import { IsEmail, IsNotEmpty, MaxLength, MinLength, IsString } from 'class-validator';

export class LoginUserDto {
  //* Validate thông tin đăng nhập
  @IsString({ message: 'Thông tin đăng nhập phải là kiểu chuỗi' })
  @IsNotEmpty({
    message:
      'Thông tin đăng nhập không được trống. Vui lòng nhập email hoặc tài khoản để đăng nhập',
  })
  identifier: string;
  //* Validate password
  @IsString({ message: 'Mật khẩu phải là kiểu chuỗi' })
  @IsNotEmpty({ message: 'Mật khẩu không được trống' })
  @MinLength(8, { message: 'Mật khẩu phải lớn hơn 8 ký tự' })
  @MaxLength(16, { message: 'Mật khẩu phải nhỏ hơn 16 ký tự' })
  password: string;
}
