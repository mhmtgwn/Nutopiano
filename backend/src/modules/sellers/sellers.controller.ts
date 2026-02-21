import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { SellersService } from './sellers.service';

@ApiTags('sellers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class SellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get('platform/sellers/applications')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List seller applications (platform)',
    description:
      'Lists seller applications for the current business. For Faz 1 this endpoint returns sellers that are inactive (isActive=false) as pending applications.',
  })
  @ApiOkResponse({ description: 'Paginated list of seller applications.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  listPlatformSellerApplications(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sellersService.listPlatformSellerApplications(req.user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('platform/sellers/:id')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get seller detail (platform)',
    description: 'Fetches seller profile details for the current business.',
  })
  @ApiOkResponse({ description: 'Seller detail payload.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  getPlatformSellerDetail(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.sellersService.getPlatformSellerDetail(req.user, Number(id));
  }

  @Patch('platform/sellers/:id/active')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Set seller active (platform)',
    description:
      'Approves (isActive=true) or rejects/suspends (isActive=false) a seller profile for the current business.',
  })
  @ApiOkResponse({ description: 'Updated seller active state.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  setPlatformSellerActive(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: { isActive: boolean },
  ) {
    return this.sellersService.setPlatformSellerActive(
      req.user,
      Number(id),
      Boolean(payload?.isActive),
    );
  }

  @Get('platform/sellers')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List sellers (platform)',
    description:
      'Lists sellers for the current business. Supports active filter and pagination.',
  })
  @ApiOkResponse({ description: 'Paginated list of sellers.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  listPlatformSellers(
    @Req() req: { user: JwtPayload },
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const isActiveBool =
      typeof isActive === 'string'
        ? isActive === 'true' || isActive === '1'
          ? true
          : isActive === 'false' || isActive === '0'
            ? false
            : undefined
        : undefined;

    return this.sellersService.listPlatformSellers(req.user, {
      isActive: isActiveBool,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
