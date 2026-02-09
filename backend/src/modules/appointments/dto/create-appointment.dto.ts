import { AppointmentStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @IsInt()
  @IsPositive()
  customerId: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  staffUserId?: number;

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @IsString()
  @IsNotEmpty()
  serviceName: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
