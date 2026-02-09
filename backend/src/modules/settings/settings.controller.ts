import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { SettingsService } from './settings.service';
import { UpsertSettingDto } from './dto/upsert-setting.dto';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'List settings for current business',
    description:
      'ADMIN and STAFF can list all settings for their business. Values are arbitrary JSON objects stored per key.',
  })
  @ApiOkResponse({ description: 'Array of settings for the current business.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN or STAFF.' })
  async findAll(@Req() req: { user: JwtPayload }) {
    const businessId = Number(req.user.businessId);
    return this.settingsService.findAll(businessId);
  }

  @Get(':key')
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Get setting by key',
    description:
      'ADMIN and STAFF can read a specific setting by key for their business. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Setting for the given key in the current business.' })
  @ApiNotFoundResponse({ description: 'Setting with the given key does not exist in the current business.' })
  async findOne(@Req() req: { user: JwtPayload }, @Param('key') key: string) {
    const businessId = Number(req.user.businessId);
    const setting = await this.settingsService.get(businessId, key);
    if (!setting) {
      // Implicit 404 via throwing here keeps behaviour consistent with other modules
      throw new (await import('@nestjs/common')).NotFoundException('Setting not found');
    }
    return setting;
  }

  @Post(':key')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create or update setting',
    description:
      'ADMIN can create or update a setting for their business. The value is stored as JSON and can later be read by Order or other modules (e.g. order.defaultStatusKey).',
  })
  @ApiOkResponse({ description: 'Upserted setting.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  async upsert(
    @Req() req: { user: JwtPayload },
    @Param('key') key: string,
    @Body() payload: UpsertSettingDto,
  ) {
    const businessId = Number(req.user.businessId);
    return this.settingsService.set(
      businessId,
      key,
      payload.value as Prisma.InputJsonValue,
    );
  }
}
