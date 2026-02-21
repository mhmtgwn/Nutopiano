import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
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
import { AdminOrStaffSelf, Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard, StaffSelfGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
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
    description:
      'ADMIN can list all users within their business. STAFF is forbidden.',
  })
  @ApiOkResponse({ description: 'Array of users in the current business.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for STAFF or missing ADMIN role.',
  })
  findAll(@Req() req: { user: JwtPayload }) {
    return this.usersService.findAll(req.user);
  }

  @AdminOrStaffSelf({ type: 'phone', param: 'phone' })
  @Get('by-phone/:phone')
  @ApiOperation({
    summary: 'Get user by phone',
    description:
      'ADMIN can fetch any user by phone within their business. STAFF can only access their own user by phone (self-only).',
  })
  @ApiOkResponse({
    description: 'User matching the given phone in the current business.',
  })
  @ApiForbiddenResponse({
    description: 'STAFF trying to access another user by phone.',
  })
  @ApiNotFoundResponse({
    description:
      'User with the given phone does not exist in the current business.',
  })
  findByPhone(@Req() req: { user: JwtPayload }, @Param('phone') phone: string) {
    return this.usersService.findByPhone(req.user, phone);
  }

  @AdminOrStaffSelf({ type: 'id', param: 'id' })
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by id',
    description:
      'ADMIN can fetch any user by id within their business. STAFF can only access their own user by id (self-only).',
  })
  @ApiOkResponse({
    description: 'User matching the given id in the current business.',
  })
  @ApiForbiddenResponse({
    description: 'STAFF trying to access another user by id.',
  })
  @ApiNotFoundResponse({
    description:
      'User with the given id does not exist in the current business.',
  })
  findById(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.findById(req.user, id);
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update user role (ADMIN only)',
    description: 'ADMIN can change role of a user within their business.',
  })
  @ApiOkResponse({ description: 'Updated user summary.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  @ApiNotFoundResponse({ description: 'User not found in current business.' })
  updateRole(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: 'ADMIN' | 'STAFF' | 'CUSTOMER' },
  ) {
    return this.usersService.updateRole(req.user, id, body.role);
  }

  @Patch(':id/active')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update user active status (ADMIN only)',
    description: 'ADMIN can activate/deactivate a user within their business.',
  })
  @ApiOkResponse({ description: 'Updated user summary.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  @ApiNotFoundResponse({ description: 'User not found in current business.' })
  updateActive(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { isActive: boolean },
  ) {
    return this.usersService.updateActive(req.user, id, Boolean(body.isActive));
  }
}
