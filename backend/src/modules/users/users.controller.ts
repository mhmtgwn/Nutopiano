import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserRoleOverrideDto } from './dto/update-user-role-override.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, StaffSelfGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Create user',
    description:
      'Creates a user in current business. USER legacy input is normalized to SELLER_STAFF.',
  })
  @ApiCreatedResponse({ description: 'Created user summary.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN/SUPER_ADMIN.',
  })
  create(@Req() req: { user: JwtPayload }, @Body() body: CreateUserDto) {
    return this.usersService.create(req.user, body);
  }

  @Roles('ADMIN')
  @Get()
  @ApiOperation({
    summary: 'List users (ADMIN only)',
    description:
      'ADMIN can list all users within their business. USER is forbidden.',
  })
  @ApiOkResponse({ description: 'Array of users in the current business.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for USER or missing ADMIN role.',
  })
  findAll(@Req() req: { user: JwtPayload }) {
    return this.usersService.findAll(req.user);
  }

  @AdminOrStaffSelf({ type: 'phone', param: 'phone' })
  @Get('by-phone/:phone')
  @ApiOperation({
    summary: 'Get user by phone',
    description:
      'ADMIN can fetch any user by phone within their business. USER can only access their own user by phone (self-only).',
  })
  @ApiOkResponse({
    description: 'User matching the given phone in the current business.',
  })
  @ApiForbiddenResponse({
    description: 'USER trying to access another user by phone.',
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
      'ADMIN can fetch any user by id within their business. USER can only access their own user by id (self-only).',
  })
  @ApiOkResponse({
    description: 'User matching the given id in the current business.',
  })
  @ApiForbiddenResponse({
    description: 'USER trying to access another user by id.',
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

  @Patch(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Update user profile fields',
    description: 'Updates name/phone/email for a user in current business.',
  })
  @ApiOkResponse({ description: 'Updated user summary.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN/SUPER_ADMIN.',
  })
  @ApiNotFoundResponse({ description: 'User not found in current business.' })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserDto,
  ) {
    return this.usersService.update(req.user, id, body);
  }

  @Patch(':id/role')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Update user role',
    description:
      'SUPER_ADMIN can change role directly (audited). ADMIN must use override endpoint for controlled role-change.',
  })
  @ApiOkResponse({ description: 'Updated user summary.' })
  @ApiForbiddenResponse({
    description:
      'Forbidden for roles other than ADMIN/SUPER_ADMIN or blocked ADMIN normal role-change.',
  })
  @ApiNotFoundResponse({ description: 'User not found in current business.' })
  updateRole(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(req.user, id, body.role);
  }

  @Patch(':id/role/override')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Override user role change (ADMIN/SUPER_ADMIN)',
    description:
      'Controlled override endpoint for role-change. reason zorunludur ve audit log yazilir.',
  })
  @ApiOkResponse({ description: 'Updated user summary.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN/SUPER_ADMIN.',
  })
  @ApiNotFoundResponse({ description: 'User not found in current business.' })
  overrideRole(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserRoleOverrideDto,
  ) {
    return this.usersService.updateRoleWithOverride(
      req.user,
      id,
      body.role,
      body.reason,
    );
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

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({
    summary: 'Soft delete user',
    description:
      'Soft-deletes a user (deletedAt + isActive=false). Can be restored later by admin tooling.',
  })
  @ApiOkResponse({ description: 'Soft-deleted user summary.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN/SUPER_ADMIN.',
  })
  @ApiNotFoundResponse({ description: 'User not found in current business.' })
  remove(
    @Req() req: { user: JwtPayload },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.delete(req.user, id);
  }
}

