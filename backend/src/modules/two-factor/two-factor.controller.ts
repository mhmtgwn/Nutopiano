import {
    Controller, Post, Get, Delete, Body, Param, UseGuards, Request, HttpCode, HttpStatus,
} from '@nestjs/common';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
    constructor(private readonly twoFactor: TwoFactorService) { }

    @Post('setup')
    async setup(@Request() req: any) {
        return this.twoFactor.setup(Number(req.user.userId));
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verify(@Request() req: any, @Body('code') code: string) {
        return this.twoFactor.verify(Number(req.user.userId), code);
    }

    @Post('disable')
    @HttpCode(HttpStatus.OK)
    async disable(@Request() req: any) {
        return this.twoFactor.disable(Number(req.user.userId));
    }

    @Get('status')
    async status(@Request() req: any) {
        return this.twoFactor.getStatus(Number(req.user.userId));
    }

    @Get('backup-codes')
    async backupCodes(@Request() req: any) {
        return this.twoFactor.regenerateBackupCodes(Number(req.user.userId));
    }

    @Post('regenerate-backup')
    async regenerateBackup(@Request() req: any) {
        return this.twoFactor.regenerateBackupCodes(Number(req.user.userId));
    }
}

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class AdminTwoFactorController {
    constructor(private readonly twoFactor: TwoFactorService) { }

    @Post(':id/2fa/reset')
    @HttpCode(HttpStatus.OK)
    async adminReset(@Param('id') id: string, @Request() req: any) {
        return this.twoFactor.adminReset(Number(id), Number(req.user.userId));
    }

    @Get(':id/2fa/status')
    async adminStatus(@Param('id') id: string) {
        return this.twoFactor.getStatus(Number(id));
    }
}
