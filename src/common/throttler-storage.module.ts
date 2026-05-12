import { Global, Module } from "@nestjs/common";
import { ThrottlerStorageRedisService } from "./throttler-storage-redis.service";

@Global()
@Module({
  providers: [ThrottlerStorageRedisService],
  exports: [ThrottlerStorageRedisService],
})
export class ThrottlerStorageModule {}
