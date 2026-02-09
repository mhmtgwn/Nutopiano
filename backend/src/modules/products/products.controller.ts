import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create product',
    description:
      'ADMIN can create products in their own business. The createdByUserId is set to the calling user.',
  })
  @ApiOkResponse({ description: 'The created product.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateProductDto) {
    return this.productsService.create(req.user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'List public products',
    description:
      'Public endpoint to list active products for the default business.',
  })
  @ApiOkResponse({ description: 'Array of active products for the default business.' })
  findAll() {
    return this.productsService.findAllPublic();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by id',
    description:
      'Public endpoint to fetch a product by id for the default business.',
  })
  @ApiOkResponse({ description: 'Product matching the given id.' })
  @ApiNotFoundResponse({ description: 'Product with the given id does not exist.' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOnePublic(Number(id));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Update product',
    description:
      'ADMIN can update any product in their business. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Updated product.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  @ApiNotFoundResponse({ description: 'Product with the given id does not exist in the current business.' })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateProductDto,
  ) {
    return this.productsService.update(req.user, Number(id), payload);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Archive (soft-delete) product',
    description:
      'ADMIN can archive products in their business. The product is marked as inactive and excluded from active lists.',
  })
  @ApiOkResponse({ description: 'Archived product (isActive set to false).' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  @ApiNotFoundResponse({ description: 'Product with the given id does not exist in the current business.' })
  remove(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.productsService.remove(req.user, Number(id));
  }
}
