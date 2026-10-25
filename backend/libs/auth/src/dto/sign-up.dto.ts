import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstname: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastname: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  // Matches Better Auth's default password length limits.
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
