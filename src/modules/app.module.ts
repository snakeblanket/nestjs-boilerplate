import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from '@/controllers/auth.controller';
import { HealthController } from '@/controllers/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [
    AuthController,
    HealthController,
    // ... 새 컨트롤러는 반드시 이 배열에 추가
  ],
  providers: [],
})
export class AppModule {}
