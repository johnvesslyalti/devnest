import { PrismaClient } from "@internal/postgres-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.POSTGRES_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const getPrisma = () => {
  return new PrismaClient({ adapter });
};

const globalForPg = global as unknown as {
  pgPrisma?: ReturnType<typeof getPrisma>;
};

export const pgPrisma = globalForPg.pgPrisma || getPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPrisma = pgPrisma;
}
