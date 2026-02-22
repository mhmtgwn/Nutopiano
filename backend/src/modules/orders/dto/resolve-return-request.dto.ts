import { IsEnum, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export enum ResolveReturnRequestAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ResolveReturnRequestDto {
  @IsEnum(ResolveReturnRequestAction)
  action: ResolveReturnRequestAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(/^[^<>]*$/, { message: 'HTML tag kullanılamaz' })
  note?: string;
}
