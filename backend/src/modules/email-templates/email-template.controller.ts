import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { EmailTemplateService } from './email-template.service';

@Controller('email-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailTemplateController {
    constructor(private readonly service: EmailTemplateService) { }

    @Get()
    @Roles('SUPER_ADMIN', 'ADMIN')
    findAll(@Req() req: any) {
        return this.service.findAll(req.user.businessId);
    }

    @Get(':id')
    @Roles('SUPER_ADMIN', 'ADMIN')
    findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
        return this.service.findOne(req.user.businessId, id);
    }

    @Post()
    @Roles('SUPER_ADMIN', 'ADMIN')
    create(@Req() req: any, @Body() body: { key: string; name: string; subject: string; bodyHtml: string; variables?: any }) {
        return this.service.create(req.user.businessId, body);
    }

    @Put(':id')
    @Roles('SUPER_ADMIN', 'ADMIN')
    update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: { name?: string; subject?: string; bodyHtml?: string; variables?: any; isActive?: boolean }) {
        return this.service.update(req.user.businessId, id, body);
    }

    @Post(':id/test')
    @Roles('SUPER_ADMIN', 'ADMIN')
    sendTest(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: { email: string }) {
        return this.service.sendTest(req.user.businessId, id, body.email);
    }
}
