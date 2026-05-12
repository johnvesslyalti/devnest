import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { ValidationPipe } from '../../src/common/pipes/validation.pipe';
import * as cookieParser from 'cookie-parser';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * A no-op throttler guard — always returns true.
 * Used to bypass rate limiting in E2E tests.
 */
class NoThrottleGuard extends ThrottlerGuard {
  async canActivate(_context: ExecutionContext): Promise<boolean> {
    return true;
  }
}

/**
 * Creates a NestJS app for E2E testing with ThrottlerGuard overridden
 * so rate limiting never interferes with test runs.
 */
export const createTestApp = async (): Promise<INestApplication> => {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(ThrottlerGuard)
    .useClass(NoThrottleGuard)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  await app.init();
  return app;
};
