import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateOutboxTestEventDto {
  @IsString()
  @MaxLength(120)
  eventType: string;

  @IsString()
  @MaxLength(120)
  aggregateType: string;

  @IsString()
  @MaxLength(120)
  aggregateId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  idempotencyKey?: string;

  @IsOptional()
  @IsObject()
  payloadJson?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  forceFail?: boolean;
}
