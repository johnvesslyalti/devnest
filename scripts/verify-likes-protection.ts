
import { PrismaClient } from '@internal/postgres-client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('Starting likes protection verification...');
  
  const email = `test.likes.${Date.now()}@example.com`;
  const password = 'Password@123';
  const username = `liker_${Date.now()}`;

  // 1. Register User
  console.log('1. Registering user...');
  let user;
  let accessToken;
  try {
    const res = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        username,
        name: 'Likes Tester'
    });
    user = res.data;
    accessToken = res.data.accessToken;
    console.log('   User registered:', user.id);
  } catch (e: any) {
    console.error('   Registration failed:', e.response?.data || e.message);
    process.exit(1);
  }

  // 2. Create Post
  console.log('2. Creating Post directly via Prisma...');
  const post = await prisma.post.create({
    data: {
      content: 'This is a test post for likes rate limiting',
      authorId: user.id,
      imageUrl: 'https://example.com/image.png'
    }
  });
  console.log('   Post created:', post.id);

  // 3. Test Rate Limiting
  console.log('3. Testing Rate Limiting (Limit: 10, TTL: 60s)...');
  const totalRequests = 15;
  let successCount = 0;
  let failCount = 0;
  
  console.log(`   Sending ${totalRequests} requests sequentially...`);

  // We need to toggle like/unlike or just fail on duplicate like?
  // If we just POST like repeatedly, implementation might return error or success (idempotent?)
  // LikesService.like -> LikesRepository.create usually fails if unique constraint exists.
  // But rate limiting happens BEFORE controller logic. So even if it fails logic, it counts towards limit.
  // Exception filter might catch 400/409, but Throttler catches 429.
  
  for (let i = 0; i < totalRequests; i++) {
    try {
      // Toggle to avoid logic errors if possible, or just spam POST
      // Spamming POST might 409 Conflict after first one.
      // But we are testing RATE LIMITING, not logic.
      // The Guard runs before the handler.
      await axios.post(`${BASE_URL}/posts/${post.id}/like`, {}, {
        headers: { Authorization: `Bearer ${accessToken}` } 
      });
      process.stdout.write('.');
      successCount++;
    } catch (e: any) {
      if (e.response?.status === 429) {
        process.stdout.write('x');
        failCount++;
      } else if (e.response?.status === 409 || e.response?.status === 500) {
        // Expected logic error (duplicate key)
        process.stdout.write('.');
        successCount++; // Count as request passed through guard
      } else {
        process.stdout.write('E');
        console.error(`Request ${i} failed with ${e.response?.status}`);
      }
    }
  }
  console.log('');

  console.log(`   Passed Guard: ${successCount}, Throttled (429): ${failCount}`);
  if (successCount <= 10 && failCount > 0) {
      console.log('   PASSED: Rate limiting is working.');
  } else {
      console.log('   FAILED: Rate limiting did not kick in as expected.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
