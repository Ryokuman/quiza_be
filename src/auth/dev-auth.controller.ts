import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { DevLoginDto, AuthResponseDto } from './dto/index.js';

@Controller('auth')
export class DevAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('dev-login')
  async devLogin(@Body() body: DevLoginDto): Promise<AuthResponseDto> {
    return this.authService.devLogin(body.world_id);
  }
}
