import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
    constructor(private readonly service: NotificationService) { }

    @Get()
    @Roles('SUPER_ADMIN', 'ADMIN')
    findAll(
        @Req() req: any,
        @Query('type') type?: string,
        @Query('isRead') isRead?: string,
        @Query('page') page?: string,
        @Query('pageSize') pageSize?: string,
    ) {
        return this.service.findAll(req.user.businessId, {
            type,
            isRead: isRead !== undefined ? isRead === 'true' : undefined,
            page: page ? Number(page) : undefined,
            pageSize: pageSize ? Number(pageSize) : undefined,
        });
    }

    @Get('unread-count')
    @Roles('SUPER_ADMIN', 'ADMIN')
    getUnreadCount(@Req() req: any) {
        return this.service.getUnreadCount(req.user.businessId);
    }

    @Post()
    @Roles('SUPER_ADMIN', 'ADMIN')
    create(@Req() req: any, @Body() body: {
        type: string;
        title: string;
        message: string;
        source: string;
        metadata?: any;
    }) {
        return this.service.create(req.user.businessId, body);
    }

    @Put(':id/read')
    @Roles('SUPER_ADMIN', 'ADMIN')
    markAsRead(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.markAsRead(req.user.businessId, id);
    }

    @Put(':id/dismiss')
    @Roles('SUPER_ADMIN', 'ADMIN')
    dismiss(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.dismiss(req.user.businessId, id);
    }

    @Put('read-all')
    @Roles('SUPER_ADMIN', 'ADMIN')
    markAllAsRead(@Req() req: any) {
        return this.service.markAllAsRead(req.user.businessId);
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN', 'ADMIN')
    remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.remove(req.user.businessId, id);
    }
}
