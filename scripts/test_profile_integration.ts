
import { PrismaClient } from '@internal/postgres-client';
import { ProfileRepository } from '../src/profile/profile.repository';
import { ProfileService } from '../src/profile/profile.service';

// Mock Cache implementation
class MockCache {
  private store = new Map<string, any>();

  async get(key: string) {
    return this.store.get(key);
  }

  async set(key: string, value: any, ttl?: number) {
    this.store.set(key, value);
  }

  async del(key: string) {
    this.store.delete(key);
  }
}

async function main() {
  console.log('--- Starting Profile Integration Test ---');

  // 1. Setup Dependencies
  const prisma = new PrismaClient();
  // We need to cast prisma to any because ProfileRepository expects PrismaService
  const profileRepository = new ProfileRepository(prisma as any);

  // Setup memory cache
  const memoryCache = new MockCache();


  const profileService = new ProfileService(profileRepository, memoryCache as any);

  try {
    // 2. Create Test Data
    const uniqueId = Date.now();
    const username = `testuser_${uniqueId}`;
    const email = `testuser_${uniqueId}@example.com`;

    console.log(`Creating test user: ${username}`);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: 'password123',
        name: 'Test Profile User',
        bio: 'Initial bio',
      },
    });

    console.log(`User created with ID: ${user.id}`);

    // 3. Test getPublicProfile (via findUser)
    console.log('\n--- Testing findUser (Cache Miss) ---');
    const profile1 = await profileService.findUser(user.id);
    console.log('Profile found:', profile1?.username);

    if (profile1?.bio !== 'Initial bio') {
      throw new Error(`Expected bio 'Initial bio', got '${profile1?.bio}'`);
    }

    // 4. Test Cache Hit
    // modifying DB directly to see if service returns cached value
    console.log('\n--- Testing Cache Hit ---');
    await prisma.user.update({
      where: { id: user.id },
      data: { bio: 'Secret Bio' },
    });
    
    const profile2 = await profileService.findUser(user.id);
    console.log('Profile found (should be cached):', profile2?.bio);

    if (profile2?.bio !== 'Initial bio') {
        // If it got 'Secret Bio', then cache didn't work
        console.warn('WARNING: Cache miss or cache not working as expected. Got updated value directly.');
    } else {
        console.log('SUCCESS: Got cached bio (Initial bio) despite DB update.');
    }

    // 5. Test Update Bio (and Cache Invalidation)
    console.log('\n--- Testing updateBio ---');
    const updatedProfile = await profileService.updateBio(user.id, 'Updated Bio via Service');
    console.log('Updated bio:', updatedProfile.bio);

    if (updatedProfile.bio !== 'Updated Bio via Service') {
      throw new Error('Update failed');
    }

    // 6. Verify Cache Invalidation
    console.log('\n--- Verify Cache Invalidation ---');
    const profile3 = await profileService.findUser(user.id);
    console.log('Profile found after update:', profile3?.bio);

    if (profile3?.bio !== 'Updated Bio via Service') {
      throw new Error(`Expected 'Updated Bio via Service', got '${profile3?.bio}'`);
    }

    // 7. Test Search
    console.log('\n--- Testing Search ---');
    // Use full username to ensure we find THIS user among potential many 'testuser' records
    const searchResults = await profileService.searchUsers(username); 
    console.log(`Found ${searchResults.length} users matching search.`);
    const found = searchResults.find(u => u.username === username);
    if (!found) {
        throw new Error('Search did not find the created user');
    }
    console.log('Search successful.');

    // Cleanup
    console.log('\n--- Cleanup ---');
    await prisma.user.delete({ where: { id: user.id } });
    console.log('Test user deleted.');

  } catch (error) {
    console.error('Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
