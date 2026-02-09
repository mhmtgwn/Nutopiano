import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOrStaffSelf, Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard, StaffSelfGuard } from '@core/guards';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StaffSelfGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN')
  @Get()
  @ApiOperation({
    summary: 'List users (ADMIN only)',
    description: 'ADMIN can list all users within their business. STAFF is forbidden.',
  })
  @ApiOkResponse({ description: 'Array of users in the current business.' })
  @ApiForbiddenResponse({ description: 'Forbidden for STAFF or missing ADMIN role.' })
  findAll() {
    return this.usersService.findAll();
  }

  @AdminOrStaffSelf({ type: 'phone', param: 'phone' })
  @Get('by-phone/:phone')
  @ApiOperation({
    summary: 'Get user by phone',
    description:
      'ADMIN can fetch any user by phone within their business. STAFF can only access their own user by phone (self-only).',
  })
  @ApiOkResponse({ description: 'User matching the given phone in the current business.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to access another user by phone.' })
  @ApiNotFoundResponse({ description: 'User with the given phone does not exist in the current business.' })
  findByPhone(@Param('phone') phone: string) {
    return this.usersService.findByPhone(phone);
  }

  @AdminOrStaffSelf({ type: 'id', param: 'id' })
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by id',
    description:
      'ADMIN can fetch any user by id within their business. STAFF can only access their own user by id (self-only).',
  })
  @ApiOkResponse({ description: 'User matching the given id in the current business.' })
  @ApiForbiddenResponse({ description: 'STAFF trying to access another user by id.' })
  @ApiNotFoundResponse({ description: 'User with the given id does not exist in the current business.' })
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }
}
