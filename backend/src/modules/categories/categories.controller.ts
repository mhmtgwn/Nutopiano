import {
  Body,
  Controller,
  Delete,
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
import { CategoriesService, CategoryTree } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Create category',
    description: 'ADMIN can create categories within their business.',
  })
  @ApiOkResponse({ description: 'The created category.' })
  @ApiForbiddenResponse({
    description: 'Forbidden for roles other than ADMIN.',
  })
  create(@Req() req: { user: JwtPayload }, @Body() payload: CreateCategoryDto) {
    return this.categoriesService.create(req.user, payload);
  }

  @Get()
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'List categories',
    description: 'ADMIN can list active categories within their business.',
  })
  @ApiOkResponse({ description: 'Array of active categories.' })
  findAll(
    @Req() req: { user: JwtPayload },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const hasPagination = Boolean(page) || Boolean(pageSize);

    if (hasPagination) {
      return this.categoriesService.findAllPaginated(req.user, {
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      });
    }

    return this.categoriesService.findAll(req.user);
  }

  @Get('tree')
  @Roles('ADMIN', 'SELLER')
  @ApiOperation({
    summary: 'Get category tree',
    description:
      'ADMIN can fetch the hierarchical category tree for their business.',
  })
  @ApiOkResponse({ description: 'Hierarchical category tree structure.' })
  getTree(@Req() req: { user: JwtPayload }): Promise<CategoryTree[]> {
    return this.categoriesService.getCategoryTree(req.user);
  }

  @Patch(':id')
  @Roles('ADMIN')
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
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Archive (soft-delete) category',
    description:
      'ADMIN can archive categories within their business (isActive=false).',
  })
  @ApiOkResponse({ description: 'Archived category (isActive set to false).' })
  remove(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.categoriesService.remove(req.user, Number(id));
  }
}
