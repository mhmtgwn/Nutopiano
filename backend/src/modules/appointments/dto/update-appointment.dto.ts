import { AppointmentStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @IsPositive()
  staffUserId?: number;
}
