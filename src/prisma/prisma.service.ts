import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from "@nestjs/common";
import { PrismaClient } from "@internal/postgres-client";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(@Inject(ConfigService) config: ConfigService) {
    const connectionString = config.get<string>("POSTGRES_URL");
    const pool = new Pool({
      connectionString,
      // Target around 4 connections per instance if we have many CPU workers
      max: 4,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    const servicePool = pool;
    const adapter = new PrismaPg(pool);
    super({ adapter } as any);
    this.pool = servicePool;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
