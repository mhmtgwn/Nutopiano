import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class IyzicoRetrieveDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}
