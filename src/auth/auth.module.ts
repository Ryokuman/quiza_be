import { Module, Type } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { DevAuthController } from './dev-auth.controller.js';
import { JwtStrategy } from './jwt.strategy.js';

const controllers: Type[] = [AuthController];
if (process.env.NODE_ENV !== 'production') {
  controllers.push(DevAuthController);
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers,
  exports: [AuthService],
})
export class AuthModule {}
