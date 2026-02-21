import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ReceiveWebhookDto {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsOptional()
  @IsString()
  eventType?: string;

  @IsOptional()
  payload?: unknown;

  @IsOptional()
  @IsInt()
  @Min(1)
  businessId?: number;
}
