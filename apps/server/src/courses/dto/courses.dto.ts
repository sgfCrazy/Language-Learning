import { IsOptional, IsString, IsInt, Min } from 'class-validator';

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
