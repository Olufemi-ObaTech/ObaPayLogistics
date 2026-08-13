import { Body, Controller, Post, Ip, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  // Tighter throttle on login than the global default: brute-force defense.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string, @Headers('user-agent') userAgent: string) {
    return this.authService.login(dto, ip, userAgent ?? 'unknown');
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@CurrentUser() user: { id: string }, @Body() dto: Partial<RefreshTokenDto>) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  // 6-digit TOTP codes have only 1,000,000 possibilities; without a tight
  // throttle here an attacker could brute-force a code within its 30s window.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/enable')
  enableTotp(@CurrentUser() user: { id: string }) {
    return this.authService.enableTotp(user.id);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/confirm')
  confirmTotp(@CurrentUser() user: { id: string }, @Body('code') code: string) {
    return this.authService.confirmTotp(user.id, code);
  }
}
