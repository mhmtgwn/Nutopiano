import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('platform/plans')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List plans (platform)',
    description:
      'Lists subscription plans (monthly/yearly) for the current business. Supports interval, isActive filters and pagination.',
  })
  @ApiOkResponse({ description: 'Paginated list of plans for platform admin.' })
  listPlatformPlans(
    @Req() req: { user: JwtPayload },
    @Query('interval') interval?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.plansService.listPlatformPlans(req.user, {
      interval: interval || undefined,
      isActive,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post('platform/plans')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create a plan (platform)',
    description:
      'Creates a new plan (monthly/yearly) for the current business.',
  })
  @ApiOkResponse({ description: 'Created plan.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  createPlatformPlan(
    @Req() req: { user: JwtPayload },
    @Body() payload: CreatePlanDto,
  ) {
    return this.plansService.createPlatformPlan(req.user, payload);
  }

  @Patch('platform/plans/:id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update a plan (platform)',
    description: 'Updates an existing plan for the current business.',
  })
  @ApiOkResponse({ description: 'Updated plan.' })
  updatePlatformPlan(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdatePlanDto,
  ) {
    return this.plansService.updatePlatformPlan(req.user, Number(id), payload);
  }
}
