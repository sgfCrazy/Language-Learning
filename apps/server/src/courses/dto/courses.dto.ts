import { IsIn, IsOptional, IsString, IsInt, MaxLength, Min, MinLength } from 'class-validator';

export class ListCoursePacksDto {
  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class ImportMediaCourseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsIn(['audio', 'video', 'music'])
  type!: 'audio' | 'video' | 'music';

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  mediaUrl?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30000)
  transcript!: string;
}
