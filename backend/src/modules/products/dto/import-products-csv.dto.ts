import { IsIn, IsOptional, IsString } from 'class-validator';

export class ImportProductsCsvDto {
  @IsString()
  csv: string;

  @IsOptional()
  @IsIn(['id', 'sku'])
  upsertBy?: 'id' | 'sku';
}

