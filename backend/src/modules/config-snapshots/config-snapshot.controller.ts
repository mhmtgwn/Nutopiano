import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConfigSnapshotService } from './config-snapshot.service';

@Controller('config-snapshots')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfigSnapshotController {
    constructor(private readonly service: ConfigSnapshotService) { }

    @Get()
    @Roles('SUPER_ADMIN', 'ADMIN')
    findAll(
        @Req() req: any,
        @Query('configType') configType?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        return this.service.findAll(req.user.businessId, {
            configType,
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
        });
    }

    @Get(':id')
    @Roles('SUPER_ADMIN', 'ADMIN')
    findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(req.user.businessId, id);
    }

    @Post()
    @Roles('SUPER_ADMIN')
    create(@Req() req: any, @Body() body: {
        configType: string;
        configKey: string;
        snapshot: any;
    }) {
        return this.service.create(req.user.businessId, body);
    }

    @Post(':id/restore')
    @Roles('SUPER_ADMIN')
    restore(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.restore(req.user.businessId, id);
    }
}
