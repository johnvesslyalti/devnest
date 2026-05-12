
import { PrismaClient } from '@internal/postgres-client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log('Last User UserAgent:', user?.lastLoginUserAgent);
  
  const token = await prisma.refreshToken.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log('Last Token UserAgent:', token?.userAgent);
}

main().catch(console.error).finally(() => prisma.$disconnect());
