import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApiKeyService } from './api-key.service';

@Controller('api-keys')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApiKeyController {
    constructor(private readonly service: ApiKeyService) { }

    @Get()
    @Roles('SUPER_ADMIN')
    findAll(@Req() req: any) {
        return this.service.findAll(req.user.businessId);
    }

    @Post()
    @Roles('SUPER_ADMIN')
    create(@Req() req: any, @Body() body: {
        name: string;
        sellerId?: number;
        scopes: string[];
        ipWhitelist?: string[];
        rateLimit?: number;
        expiresAt?: string;
    }) {
        return this.service.create(req.user.businessId, body);
    }

    @Put(':id')
    @Roles('SUPER_ADMIN')
    update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: {
        name?: string;
        scopes?: string[];
        ipWhitelist?: string[];
        rateLimit?: number;
        isActive?: boolean;
        expiresAt?: string;
    }) {
        return this.service.update(req.user.businessId, id, body);
    }

    @Put(':id/toggle')
    @Roles('SUPER_ADMIN')
    toggle(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.toggle(req.user.businessId, id);
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN')
    remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.remove(req.user.businessId, id);
    }
}
