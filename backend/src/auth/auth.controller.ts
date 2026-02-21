import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import type { CookieOptions } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '@common/guards';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const ACCESS_COOKIE = 'nutopiano_access';
const REFRESH_COOKIE = 'nutopiano_refresh';

const buildCookieOptions = (): CookieOptions => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    path: '/',
    domain: isProd ? '.nutopiano.com' : undefined,
  };
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private getCookie(req: unknown, key: string): string | undefined {
    const cookies = (req as { cookies?: Record<string, unknown> } | null)
      ?.cookies;
    const value = cookies?.[key];
    return typeof value === 'string' ? value : undefined;
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { ttl: 15 * 60_000, limit: 5 } })
  @ApiOperation({
    summary: 'Login with phone number',
    description:
      'Authenticates a user by phone and returns a JWT access token.',
  })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({
    description: 'Successfully authenticated. Returns a JWT access token.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or inactive user.',
  })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(body);
    const opts = buildCookieOptions();
    res.cookie(ACCESS_COOKIE, result.accessToken, {
      ...opts,
      maxAge: 1000 * 60 * 15,
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...opts,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout', description: 'Clears auth cookies.' })
  @ApiOkResponse({ description: 'OK' })
  async logout(@Req() req: unknown, @Res({ passthrough: true }) res: Response) {
    const opts = buildCookieOptions();

    const refreshToken = this.getCookie(req, REFRESH_COOKIE);
    if (typeof refreshToken === 'string' && refreshToken.trim().length > 0) {
      try {
        await this.authService.revokeRefreshToken(refreshToken);
      } catch {
        // ignore
      }
    }

    res.clearCookie(ACCESS_COOKIE, opts);
    res.clearCookie(REFRESH_COOKIE, opts);
    return { ok: true };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Rotates refresh token and issues a new access token.',
  })
  @ApiOkResponse({ description: 'OK' })
  async refresh(
    @Req() req: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = this.getCookie(req, REFRESH_COOKIE);
    if (typeof refreshToken !== 'string' || refreshToken.trim().length === 0) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.authService.refresh(refreshToken);
    const opts = buildCookieOptions();
    res.cookie(ACCESS_COOKIE, result.accessToken, {
      ...opts,
      maxAge: 1000 * 60 * 15,
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...opts,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return { ok: true };
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register a customer',
    description:
      'Creates a CUSTOMER user with phone+email and returns a JWT access token.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({
    description: 'Successfully registered. Returns a JWT access token.',
  })
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body);
    const opts = buildCookieOptions();
    res.cookie(ACCESS_COOKIE, result.accessToken, {
      ...opts,
      maxAge: 1000 * 60 * 15,
    });
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...opts,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    return result;
  }

  @Post('forgot-password')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { ttl: 15 * 60_000, limit: 3 } })
  @ApiOperation({
    summary: 'Request password reset (email)',
    description:
      'Sends a password reset email if the user exists. Always returns ok.',
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'OK' })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Resets the password using the token from the reset email.',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'OK' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the authenticated user profile decoded from the JWT access token.',
  })
  @ApiOkResponse({
    description: 'Profile of the currently authenticated user.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing or invalid JWT access token.',
  })
  profile(@Req() req: { user: JwtPayload }) {
    return this.authService.profile(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Updates name/phone/email for the authenticated user.',
  })
  @ApiOkResponse({ description: 'Updated profile.' })
  updateProfile(
    @Req() req: { user: JwtPayload },
    @Body() body: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(req.user, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change password',
    description:
      'Changes password for the authenticated user (requires current password).',
  })
  @ApiOkResponse({ description: 'OK' })
  changePassword(
    @Req() req: { user: JwtPayload },
    @Body() body: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user, body);
  }
}
