import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
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
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductsService } from './products.service';
import { ImportProductsCsvDto } from './dto/import-products-csv.dto';
import type { Response } from 'express';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('manage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SELLER', 'STAFF')
  @ApiOperation({
    summary: 'List products (seller portal)',
    description:
      'SELLER/STAFF can list active products for their business with pagination.',
  })
  @ApiOkResponse({
    description: 'Paginated list of products for the current business.',
  })
  findAllManage(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.productsService.findAll(req.user, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get('export/csv')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Export products as CSV',
    description:
      'Exports products for the current business as CSV for Excel-compatible bulk edits.',
  })
  @ApiOkResponse({
    description: 'CSV document containing product rows.',
  })
  async exportCsv(
    @Req() req: { user: JwtPayload },
    @Res() res: Response,
  ) {
    const csv = await this.productsService.exportProductsCsv(req.user);
    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="products-${dateStamp}.csv"`,
    );
    res.send(csv);
  }

  @Post('import/csv')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Import products from CSV',
    description:
      'Imports/updates product rows in bulk using CSV text. Matching is done by id or sku.',
  })
  @ApiOkResponse({
    description: 'Bulk import result with created/updated/error counts.',
  })
  importCsv(
    @Req() req: { user: JwtPayload },
    @Body() payload: ImportProductsCsvDto,
  ) {
    return this.productsService.importProductsCsv(req.user, payload);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Create product',
    description:
      'ADMIN can create products in their own business. The createdByUserId is set to the calling user.',
  })
  @ApiOkResponse({ description: 'The created product.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateProductDto) {
    return this.productsService.create(req.user, payload);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search products',
    description:
      'Public endpoint to search and filter products. Supports query, category, price range, and sorting.',
  })
  @ApiOkResponse({ description: 'Array of products matching search criteria.' })
  search(
    @Query('q') query?: string,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.productsService.searchProducts({
      query: query || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sort: sort || 'newest',
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 20,
    });
  }

  @Get()
  @ApiOperation({
    summary: 'List public products',
    description:
      'Public endpoint to list active products for the default business.',
  })
  @ApiOkResponse({
    description: 'Paginated list of active products for the default business.',
  })
  findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.productsService.findAllPublic({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by id',
    description:
      'Public endpoint to fetch a product by id for the default business.',
  })
  @ApiOkResponse({ description: 'Product matching the given id.' })
  @ApiNotFoundResponse({
    description: 'Product with the given id does not exist.',
  })
  findOne(@Param('id') id: string) {
    return this.productsService.findOnePublic(Number(id));
  }

  @Get(':id/reviews')
  @ApiOperation({
    summary: 'List product reviews',
    description:
      'Public endpoint to list reviews for a product in the default business.',
  })
  @ApiOkResponse({ description: 'Array of product reviews.' })
  listReviews(@Param('id') id: string) {
    return this.productsService.listReviewsPublic(Number(id));
  }

  @Get(':id/variants')
  @ApiOperation({
    summary: 'List product variants',
    description: 'Public endpoint to list active variants for a product.',
  })
  @ApiOkResponse({ description: 'Array of active product variants.' })
  listVariantsPublic(@Param('id') id: string) {
    return this.productsService.listVariantsPublic(Number(id));
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER', 'STAFF')
  @ApiOperation({
    summary: 'Update product',
    description:
      'ADMIN can update any product in their business. Cross-tenant access is not allowed.',
  })
  @ApiOkResponse({ description: 'Updated product.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  @ApiNotFoundResponse({
    description:
      'Product with the given id does not exist in the current business.',
  })
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
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Archive (soft-delete) product',
    description:
      'ADMIN can archive products in their business. The product is marked as inactive and excluded from active lists.',
  })
  @ApiOkResponse({ description: 'Archived product (isActive set to false).' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  @ApiNotFoundResponse({
    description:
      'Product with the given id does not exist in the current business.',
  })
  remove(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.productsService.remove(req.user, Number(id));
  }

  @Post(':id/variants')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Create product variant',
    description:
      'Creates a variant under a product in the current business with its own stock and price.',
  })
  @ApiOkResponse({ description: 'The created product variant.' })
  createVariant(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: CreateProductVariantDto,
  ) {
    return this.productsService.createVariant(req.user, Number(id), payload);
  }

  @Get(':id/variants/manage')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SELLER', 'STAFF')
  @ApiOperation({
    summary: 'List product variants (manage)',
    description: 'Lists all variants including inactive ones for staff/admin UI.',
  })
  @ApiOkResponse({ description: 'Array of product variants.' })
  listVariantsManage(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.productsService.listVariants(req.user, Number(id), {
      includeInactive: true,
    });
  }

  @Patch(':id/variants/:variantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Update product variant',
    description: 'Updates an existing product variant.',
  })
  @ApiOkResponse({ description: 'Updated product variant.' })
  updateVariant(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() payload: UpdateProductVariantDto,
  ) {
    return this.productsService.updateVariant(
      req.user,
      Number(id),
      Number(variantId),
      payload,
    );
  }

  @Delete(':id/variants/:variantId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'STAFF')
  @ApiOperation({
    summary: 'Archive product variant',
    description: 'Soft-deletes a product variant by setting isActive=false.',
  })
  @ApiOkResponse({ description: 'Archived product variant.' })
  removeVariant(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.removeVariant(
      req.user,
      Number(id),
      Number(variantId),
    );
  }
}
