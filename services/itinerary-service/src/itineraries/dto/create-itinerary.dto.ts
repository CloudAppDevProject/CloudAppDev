import { IsInt, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLocationDto {
  @IsString()
  name: string;

  @IsString()
  start_date: string;

  @IsString()
  end_date: string;

  @IsOptional()
  @IsString()
  short_desc?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;
}

export class CreateItineraryDto {
  @IsInt()
  userId: number;

  @IsString()
  title: string;

  @IsString()
  destination: string;

  @IsString()
  start_date: string;

  @IsOptional()
  @IsString()
  short_desc?: string;

  @IsOptional()
  @IsString()
  detail_desc?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLocationDto)
  locations?: CreateLocationDto[];
}
