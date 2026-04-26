import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const frontendUrl = process.env.FRONTEND_URL;
  app.enableCors({
    origin: frontendUrl ?? 'http://localhost:3001',
    credentials: true,
  });
  if (!frontendUrl) {
    console.warn('⚠️  FRONTEND_URL not set — CORS defaults to http://localhost:3001');
  }
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
