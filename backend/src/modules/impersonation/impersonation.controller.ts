import {
  Controller,
  Post,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ImpersonationService } from './impersonation.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  ACCESS_COOKIE,
  buildAuthCookieOptions,
} from '../../auth/auth-cookie.util';

@Controller('admin/impersonate')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'ADMIN')
export class ImpersonationController {
  constructor(private readonly impersonation: ImpersonationService) {}

  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  async start(
    @Param('userId') userId: string,
    @Request() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.impersonation.startImpersonation(
      Number(req.user.userId),
      Number(userId),
    );
    res.cookie(ACCESS_COOKIE, result.accessToken, {
      ...buildAuthCookieOptions(),
      maxAge: 1000 * 60 * 30,
    });
    return result;
  }

  @Post('end')
  @HttpCode(HttpStatus.OK)
  async end(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.impersonation.endImpersonation(req.user);
    res.cookie(ACCESS_COOKIE, result.accessToken, {
      ...buildAuthCookieOptions(),
      maxAge: 1000 * 60 * 15,
    });
    return result;
  }
}
