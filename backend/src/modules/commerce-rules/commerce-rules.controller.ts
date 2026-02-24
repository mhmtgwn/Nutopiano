import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CommerceRulesService } from './commerce-rules.service';
import { CreateRuleProfileDto } from './dto/create-rule-profile.dto';
import { UpdateRuleProfileDto } from './dto/update-rule-profile.dto';
import { UpsertSellerChannelBindingDto } from './dto/upsert-seller-channel-binding.dto';

@ApiTags('commerce-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class CommerceRulesController {
  constructor(private readonly commerceRulesService: CommerceRulesService) {}

  @Get('platform/commerce/rule-profiles')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List commerce rule profiles',
    description:
      'Returns calculation/rule profiles with commission rule and category overrides for current business.',
  })
  @ApiOkResponse({ description: 'Rule profile list.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  listRuleProfiles(@Req() req: { user: JwtPayload }) {
    return this.commerceRulesService.listRuleProfiles(req.user);
  }

  @Post('platform/commerce/rule-profiles')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create commerce rule profile',
    description:
      'Creates a calculation profile and base commission rule with optional category overrides.',
  })
  @ApiOkResponse({ description: 'Created rule profile.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  createRuleProfile(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreateRuleProfileDto,
  ) {
    return this.commerceRulesService.createRuleProfile(req.user, payload);
  }

  @Patch('platform/commerce/rule-profiles/:id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update commerce rule profile',
    description:
      'Updates rule profile metadata and optionally replaces commission rule/overrides.',
  })
  @ApiOkResponse({ description: 'Updated rule profile.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  updateRuleProfile(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateRuleProfileDto,
  ) {
    return this.commerceRulesService.updateRuleProfile(
      req.user,
      Number(id),
      payload,
    );
  }

  @Put('platform/commerce/sellers/:sellerId/channels/:channel/profile')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Bind seller+channel to calculation profile',
    description:
      'Creates or updates channel-level rule profile binding for a seller.',
  })
  @ApiOkResponse({ description: 'Seller-channel binding.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  upsertSellerChannelBinding(
    @Req() req: { user: JwtPayload },
    @Param('sellerId') sellerId: string,
    @Param('channel') channel: string,
    @Body() payload: UpsertSellerChannelBindingDto,
  ) {
    return this.commerceRulesService.upsertSellerChannelBinding(
      req.user,
      Number(sellerId),
      channel,
      payload,
    );
  }
}
