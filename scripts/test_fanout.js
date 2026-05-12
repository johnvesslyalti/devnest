
require('dotenv').config();
const { PrismaClient } = require('@internal/postgres-client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api/v1';
const TIMESTAMP = Date.now();
const AUTHOR_EMAIL = `author_${TIMESTAMP}@example.com`;
const FOLLOWER_EMAIL = `follower_${TIMESTAMP}@example.com`;
const PASSWORD = 'password123';

let authorToken = '';
let authorId = '';
let followerToken = '';
let followerId = '';
let postId = '';

async function testStep(name, fn) {
  process.stdout.write(`Testing ${name}... `);
  try {
    await fn();
    console.log('✅ OK');
  } catch (error) {
    console.log('❌ FAILED');
    console.error(`  Error: ${error.message}`);
    if (error.responseBody) {
      console.error(`  Response: ${error.responseBody}`);
    }
    process.exit(1);
  }
}

async function request(endpoint, token, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = { ...options, headers };
  
  const res = await fetch(url, config);
  const text = await res.text();
  
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    data = text;
  }

  if (!res.ok) {
    const error = new Error(`Request to ${endpoint} failed with status ${res.status}`);
    error.responseBody = text;
    throw error;
  }

  return data;
}

async function main() {
  console.log(`Starting Fan-out Test against ${BASE_URL}\n`);

  // 1. Register Author
  await testStep('Register Author', async () => {
    const res = await request('/auth/register', null, {
      method: 'POST',
      body: JSON.stringify({
        email: AUTHOR_EMAIL,
        password: PASSWORD,
        username: `author_${TIMESTAMP}`,
        name: 'Author User'
      })
    });
    authorToken = res.accessToken;
    authorId = res.id;
  });

  // 2. Register Follower
  await testStep('Register Follower', async () => {
    const res = await request('/auth/register', null, {
      method: 'POST',
      body: JSON.stringify({
        email: FOLLOWER_EMAIL,
        password: PASSWORD,
        username: `follower_${TIMESTAMP}`,
        name: 'Follower User'
      })
    });
    followerToken = res.accessToken;
    followerId = res.id;
  });

  // 3. Create Follow Relationship
  await testStep('Seed Follower', async () => {
    await prisma.follow.create({
      data: {
        followerId: followerId,
        followingId: authorId,
      },
    });
  });

  // 4. Author Creates Post
  await testStep('Author Creates Post', async () => {
    const res = await request('/posts', authorToken, {
      method: 'POST',
      body: JSON.stringify({
        content: `Fan-out test post by ${AUTHOR_EMAIL}`
      })
    });
    postId = res.post.id;
  });

  // 5. Check Follower's Feed
  await testStep('Check Follower Feed', async () => {
    // Wait a bit for async fan-out (even if we awaited in service, good practice)
    await new Promise(r => setTimeout(r, 1000));

    const res = await request('/feed', followerToken, {
      method: 'GET'
    });

    if (!Array.isArray(res)) throw new Error('Feed should be array');
    const found = res.find(p => p.postId === postId);
    if (!found) {
        console.log('Feed content:', JSON.stringify(res, null, 2));
        throw new Error(`Post ${postId} not found in follower feed`);
    }
  });

  console.log('\n✅ Fan-out tests passed successfully!');
  await prisma.$disconnect();
}

main().catch(async err => {
  console.error('\n❌ Unexpected Error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
