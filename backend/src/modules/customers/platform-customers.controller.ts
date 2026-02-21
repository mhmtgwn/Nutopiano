import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class PlatformCustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('platform/customers')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List customers (platform)',
    description:
      'Lists customers for the current business (platform admin). Supports q search and pagination.',
  })
  @ApiOkResponse({
    description: 'Paginated list of customers for platform admin.',
  })
  listPlatformCustomers(
    @Req() req: { user: JwtPayload },
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.customersService.listPlatformCustomers(req.user, {
      q: q || undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
