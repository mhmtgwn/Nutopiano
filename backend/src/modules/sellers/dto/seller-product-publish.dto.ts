import { IsBoolean } from 'class-validator';

export class SellerProductPublishDto {
  @IsBoolean()
  isPublished: boolean;
}

