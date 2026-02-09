import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@core/decorators';
import { JwtAuthGuard, RolesGuard } from '@core/guards';
import { JwtPayload } from '../../auth/types/jwt-payload';
import { CategoriesService, CategorySummary } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create category',
    description: 'ADMIN can create categories within their business.',
  })
  @ApiOkResponse({ description: 'The created category.' })
  @ApiForbiddenResponse({ description: 'Forbidden for roles other than ADMIN.' })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateCategoryDto) {
    return this.categoriesService.create(req.user, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'List categories',
    description: 'ADMIN can list active categories within their business.',
  })
  @ApiOkResponse({ description: 'Array of active categories.' })
  findAll(@Req() req: { user: JwtPayload }): Promise<CategorySummary[]> {
    return this.categoriesService.findAll(req.user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update category',
    description: 'ADMIN can update categories within their business.',
  })
  @ApiOkResponse({ description: 'Updated category.' })
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() payload: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(req.user, Number(id), payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Archive (soft-delete) category',
    description: 'ADMIN can archive categories within their business (isActive=false).',
  })
  @ApiOkResponse({ description: 'Archived category (isActive set to false).' })
  remove(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.categoriesService.remove(req.user, Number(id));
  }
}
