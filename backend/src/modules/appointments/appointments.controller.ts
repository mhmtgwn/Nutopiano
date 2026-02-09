import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
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
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Create appointment',
    description:
      'Creates an appointment for a customer in the current business. Default duration and auto-confirm behaviour are controlled via Settings: appointment.defaultDurationMinutes, appointment.autoConfirm, and appointment.allowStaffCreate.',
  })
  @ApiOkResponse({ description: 'The created appointment.' })
  @ApiForbiddenResponse({
    description:
      'Forbidden for roles other than ADMIN or STAFF, or when STAFF is not allowed to create appointments (appointment.allowStaffCreate=false).',
  })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateAppointmentDto) {
    return this.appointmentsService.create(req.user, payload);
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'List appointments',
    description:
      'ADMIN sees all appointments in their business. STAFF sees only appointments assigned to them (staffUserId = current user). Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Array of appointments for the current business and RBAC scope.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN or STAFF.' })
  findAll(@Req() req: { user: JwtPayload }) {
    return this.appointmentsService.findAll(req.user);
  }

  @Get(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Get appointment by id',
    description:
      'ADMIN can fetch any appointment by id in their business. STAFF can fetch only appointments assigned to them. Cross-tenant access is not allowed and results in 404.',
  })
  @ApiOkResponse({ description: 'Appointment matching the given id within the current business and RBAC scope.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to access an appointment assigned to another staff or unassigned appointment.' })
  @ApiNotFoundResponse({ description: 'Appointment with the given id does not exist in the current business.' })
  findOne(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.appointmentsService.findOne(req.user, Number(id));
  }

  @Patch(':id')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Update appointment',
    description:
      'ADMIN can update any appointment in their business, including status, notes and staff assignment. STAFF can update status and notes only for appointments assigned to them. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Updated appointment.' })
  @ApiForbiddenResponse({
    description:
      'STAFF trying to update an appointment not assigned to them, or trying to change staff assignment, or roles other than ADMIN/STAFF.',
  })
  @ApiNotFoundResponse({ description: 'Appointment with the given id does not exist in the current business.' })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(req.user, Number(id), payload);
  }
}
