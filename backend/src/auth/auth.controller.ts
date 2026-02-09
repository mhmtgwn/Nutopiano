import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '@core/guards';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with phone number', description: 'Authenticates a user by phone and returns a JWT access token.' })
  @ApiBody({ type: LoginDto })
  @ApiCreatedResponse({ description: 'Successfully authenticated. Returns a JWT access token.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or inactive user.' })
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a customer', description: 'Creates a CUSTOMER user with phone+email and returns a JWT access token.' })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'Successfully registered. Returns a JWT access token.' })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset (email)', description: 'Sends a password reset email if the user exists. Always returns ok.' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiOkResponse({ description: 'OK' })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token', description: 'Resets the password using the token from the reset email.' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiOkResponse({ description: 'OK' })
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile', description: 'Returns the authenticated user profile decoded from the JWT access token.' })
  @ApiOkResponse({ description: 'Profile of the currently authenticated user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT access token.' })
  profile(@Req() req: { user: JwtPayload }) {
    return this.authService.profile(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile', description: 'Updates name/phone/email for the authenticated user.' })
  @ApiOkResponse({ description: 'Updated profile.' })
  updateProfile(@Req() req: { user: JwtPayload }, @Body() body: UpdateProfileDto) {
    return this.authService.updateProfile(req.user, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password', description: 'Changes password for the authenticated user (requires current password).' })
  @ApiOkResponse({ description: 'OK' })
  changePassword(@Req() req: { user: JwtPayload }, @Body() body: ChangePasswordDto) {
    return this.authService.changePassword(req.user, body);
  }
}
