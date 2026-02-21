import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SellersService } from './sellers.service';

@ApiTags('public-sellers')
@Controller('public/sellers')
export class PublicSellersController {
  constructor(private readonly sellersService: SellersService) {}

  @Get(':slug')
  @ApiOperation({
    summary: 'Get seller public profile by slug',
    description:
      'Public endpoint to fetch seller profile and seller products by slug.',
  })
  @ApiOkResponse({ description: 'Seller profile with paginated products.' })
  findOne(
    @Param('slug') slug: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sellersService.findOnePublicBySlug(slug, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }
}
