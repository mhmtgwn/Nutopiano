import {
    Controller, Post, Param, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ImpersonationService } from './impersonation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('admin/impersonate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ImpersonationController {
    constructor(private readonly impersonation: ImpersonationService) { }

    @Post(':userId')
    @HttpCode(HttpStatus.OK)
    async start(@Param('userId') userId: string, @Request() req: any) {
        return this.impersonation.startImpersonation(
            Number(req.user.userId),
            Number(userId),
        );
    }

    @Post('end')
    @HttpCode(HttpStatus.OK)
    async end(@Request() req: any) {
        return this.impersonation.endImpersonation(req.user);
    }
}
