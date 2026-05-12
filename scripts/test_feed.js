
const BASE_URL = 'http://localhost:3000/api/v1';
const TIMESTAMP = Date.now();
const USER_EMAIL = `feedtest_${TIMESTAMP}@example.com`;
const USER_PASSWORD = 'password123';
const USER_NAME = `Feed Tester ${TIMESTAMP}`;

let accessToken = '';

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

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  
  if (accessToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${accessToken}`;
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
  console.log(`Starting Feed API Test against ${BASE_URL}\n`);

  await testStep('Register User', async () => {
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: USER_EMAIL,
        password: USER_PASSWORD,
        username: `feed_user_${TIMESTAMP}`,
        name: USER_NAME
      })
    });
    if (res.accessToken) {
        accessToken = res.accessToken;
    }
  });

  await testStep('Login User', async () => {
    // Ensuring we have token
    if (!accessToken) {
        const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
            email: USER_EMAIL,
            password: USER_PASSWORD
        })
        });
        accessToken = res.accessToken;
    }
  });

  await testStep('Get Empty Feed', async () => {
    const res = await request('/feed');
    if (!Array.isArray(res)) throw new Error('Feed should be an array');
    if (res.length !== 0) throw new Error('New user feed should be empty');
  });

  const testPost = {
    postId: 'test-post-id',
    content: 'Hello Feed!',
    authorId: 'some-author-id',
    createdAt: new Date().toISOString()
  };

  await testStep('Add to Feed (Test Endpoint)', async () => {
    const res = await request('/feed/test', {
      method: 'POST',
      body: JSON.stringify(testPost)
    });
    // Expected to return the created/updated feed document
    if (!res.posts || !Array.isArray(res.posts)) {
        console.log('Invalid response:', JSON.stringify(res, null, 2));
        throw new Error('Invalid response from add to feed');
    }
  });

  await testStep('Get Populated Feed', async () => {
    const res = await request('/feed');
    if (!Array.isArray(res)) throw new Error('Feed should be an array');
    if (res.length !== 1) throw new Error(`Feed should have 1 item, got ${res.length}`);
    if (res[0].content !== testPost.content) throw new Error('Feed content mismatch');
  });

  console.log('\n✅ Feed tests passed successfully!');
}

main().catch(err => {
  console.error('\n❌ Unexpected Error:', err);
  process.exit(1);
});
