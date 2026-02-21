import { IsIn } from 'class-validator';

export class SetDefaultAddressDto {
  @IsIn(['shipping', 'billing'])
  type: 'shipping' | 'billing';
}
