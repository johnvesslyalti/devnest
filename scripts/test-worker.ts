import { BcryptPoolService } from '../src/auth/workers/bcrypt-pool.service';

async function main() {
  const service = new BcryptPoolService();
  service.onModuleInit();
  console.log('Service initialized.');
  try {
    const hash = await service.hash('test', 10);
    console.log('Hash result:', hash);
  } catch (error) {
    console.error('Error computing hash:', error);
  } finally {
    await service.onModuleDestroy();
  }
}

main();
