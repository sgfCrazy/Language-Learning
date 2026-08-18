import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class EmailRegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @IsString()
  @MaxLength(40)
  displayName!: string;
}

export class EmailLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class WxMiniappLoginDto {
  @IsString()
  code!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}

export class WxQrCodeCreateDto {
  @IsString()
  @MaxLength(64)
  clientId?: string;
}
