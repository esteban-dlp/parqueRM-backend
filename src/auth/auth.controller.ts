import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResponseService } from '../common/services/response.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { Request as ExpressRequest } from 'express';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responses: ResponseService,
  ) {}

  @Post('signup')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user account and auto-login' })
  async signup(@Body() dto: SignupDto, @Request() req: ExpressRequest) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    const result = await this.authService.signup(dto, ip);
    return this.responses.created(result);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with username and password' })
  async login(@Body() dto: LoginDto, @Request() req: ExpressRequest) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    const result = await this.authService.login(dto.username, dto.password, ip);
    return this.responses.ok(result, 'Login successful');
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout (stateless — invalidate token client-side)',
  })
  logout() {
    return this.responses.ok(null, 'Logged out successfully');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser('id') userId: number) {
    const profile = await this.authService.getMe(userId);
    return this.responses.ok(profile, 'User profile');
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(dto.refreshToken);
    return this.responses.ok(result, 'Token refreshed');
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change own password' })
  async changePassword(
    @CurrentUser('id') userId: number,
    @Body() dto: ChangePasswordDto,
    @Request() req: ExpressRequest,
  ) {
    const ip = req.ip ?? req.socket?.remoteAddress;
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
      ip,
    );
    return this.responses.ok(null, 'Password changed successfully');
  }
}
