import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class IyzicoInitializeDto {
  @IsInt()
  @Min(1)
  orderId: number;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
