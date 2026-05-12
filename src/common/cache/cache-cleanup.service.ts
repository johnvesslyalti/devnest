import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Cache } from "cache-manager";

@Injectable()
export class CacheCleanupService implements OnModuleDestroy {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async onModuleDestroy() {
    const cacheAny = this.cacheManager as any;
    const store = cacheAny.store || cacheAny.stores?.[0];
    const client = store?.client;

    if (!client) {
      return;
    }

    if (typeof client.quit === "function") {
      await client.quit();
      return;
    }

    if (typeof client.disconnect === "function") {
      client.disconnect();
    }
  }
}
