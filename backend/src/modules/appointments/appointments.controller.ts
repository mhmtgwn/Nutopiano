import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Create appointment',
    description:
      'Creates an appointment for a customer in the current business. Default duration and auto-confirm behaviour are controlled via Settings: appointment.defaultDurationMinutes, appointment.autoConfirm, and appointment.allowStaffCreate.',
  })
  @ApiOkResponse({ description: 'The created appointment.' })
  @ApiForbiddenResponse({
    description:
      'Forbidden for roles other than ADMIN or USER, or when USER is not allowed to create appointments (appointment.allowStaffCreate=false).',
  })
  create(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(req.user, payload);
  }

  @Get()
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'List appointments',
    description:
      'ADMIN sees all appointments in their business. USER sees only appointments assigned to them (staffUserId = current user). Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({
    description:
      'Array of appointments for the current business and RBAC scope.',
  })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN or USER.',
  })
  findAll(@Req() req: { user: JwtPayload }) {
    return this.appointmentsService.findAll(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Get appointment by id',
    description:
      'ADMIN can fetch any appointment by id in their business. USER can fetch only appointments assigned to them. Cross-tenant access is not allowed and results in 404.',
  })
  @ApiOkResponse({
    description:
      'Appointment matching the given id within the current business and RBAC scope.',
  })
  @ApiForbiddenResponse({
    description:
      'USER trying to access an appointment assigned to another staff or unassigned appointment.',
  })
  @ApiNotFoundResponse({
    description:
      'Appointment with the given id does not exist in the current business.',
  })
  findOne(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.appointmentsService.findOne(req.user, Number(id));
  }

  @Patch(':id')
  @Roles('ADMIN', 'USER')
  @ApiOperation({
    summary: 'Update appointment',
    description:
      'ADMIN can update any appointment in their business, including status, notes and staff assignment. USER can update status and notes only for appointments assigned to them. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Updated appointment.' })
  @ApiForbiddenResponse({
    description:
      'USER trying to update an appointment not assigned to them, or trying to change staff assignment, or roles other than ADMIN/USER.',
  })
  @ApiNotFoundResponse({
    description:
      'Appointment with the given id does not exist in the current business.',
  })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(req.user, Number(id), payload);
  }
}

