import { IsString } from 'class-validator';

export class EmailRegisterDto {
  @IsString()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  displayName!: string;
}

export class EmailLoginDto {
  @IsString()
  email!: string;

  @IsString()
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
  clientId?: string;
}