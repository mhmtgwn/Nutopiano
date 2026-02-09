import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('public-categories')
@Controller('public/categories')
export class PublicCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List public categories',
    description: 'Public endpoint to list active categories for the default business.',
  })
  @ApiOkResponse({ description: 'Array of active categories for the default business.' })
  findAll() {
    return this.categoriesService.findAllPublic();
  }

  @Get(':slug')
  @ApiOperation({
    summary: 'Get public category by slug',
    description: 'Public endpoint to fetch an active category (and its active products) by slug.',
  })
  @ApiOkResponse({ description: 'Active category with active products.' })
  findOne(@Param('slug') slug: string) {
    return this.categoriesService.findOnePublicBySlug(slug);
  }
}
