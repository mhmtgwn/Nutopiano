import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FeatureFlagService } from './feature-flag.service';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FeatureFlagController {
    constructor(private readonly featureFlagService: FeatureFlagService) { }

    @Get()
    @Roles('SUPER_ADMIN', 'ADMIN')
    async findAll(@Req() req: any) {
        return this.featureFlagService.findAll(req.user.businessId);
    }

    @Post()
    @Roles('SUPER_ADMIN')
    async create(@Body() body: { key: string; description?: string; scope: string; isActive?: boolean }, @Req() req: any) {
        return this.featureFlagService.create({
            ...body,
            businessId: body.scope === 'GLOBAL' ? undefined : req.user.businessId,
        });
    }

    @Put(':id')
    @Roles('SUPER_ADMIN')
    async update(@Param('id', ParseIntPipe) id: number, @Body() body: { description?: string; isActive?: boolean; scope?: string }) {
        return this.featureFlagService.update(id, body);
    }

    @Put(':id/toggle')
    @Roles('SUPER_ADMIN')
    async toggle(@Param('id', ParseIntPipe) id: number) {
        return this.featureFlagService.toggle(id);
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.featureFlagService.remove(id);
    }
}
