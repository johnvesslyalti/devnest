import { Test, TestingModule } from '@nestjs/testing';
import { BcryptPoolService } from '../src/auth/workers/bcrypt-pool.service';

describe('BcryptPoolService Thread Pool Initialization and Load Handling (e2e)', () => {
  let bcryptPoolService: BcryptPoolService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [BcryptPoolService],
    }).compile();

    bcryptPoolService = moduleFixture.get<BcryptPoolService>(BcryptPoolService);
    
    // Explicitly initialize the module to trigger onModuleInit
    bcryptPoolService.onModuleInit();
  });

  afterAll(async () => {
    if (bcryptPoolService) {
      await bcryptPoolService.onModuleDestroy();
    }
  });

  it('verifies piscina initializes and processes concurrent hashing requests without throwing errors', async () => {
    const password = 'SuperSecurePassword123!';
    const numRequests = 4;
    const saltRounds = 4;
    const promises = [];

    // Exercise concurrent worker execution without making CI timing-dependent.
    for (let i = 0; i < numRequests; i++) {
      promises.push(bcryptPoolService.hash(password, saltRounds));
    }

    // Wait for all hashing to complete
    const hashes = await Promise.all(promises);

    expect(hashes.length).toBe(numRequests);

    // Verify first and last hash
    const firstMatch = await bcryptPoolService.compare(password, hashes[0]);
    const lastMatch = await bcryptPoolService.compare(password, hashes[hashes.length - 1]);

    expect(firstMatch).toBe(true);
    expect(lastMatch).toBe(true);
  }, 30000);
});
