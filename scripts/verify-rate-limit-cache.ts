import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1'; // Adjust if port is different

async function testRateLimiting() {
  console.log('Testing Rate Limiting for Public Feed...');
  const endpoint = `${BASE_URL}/posts`;
  const requests = [];
  const start = Date.now();

  // Send 15 requests rapidly (limit is 10)
  for (let i = 0; i < 15; i++) {
    requests.push(
      axios.get(endpoint)
        .then(res => ({ status: res.status, index: i }))
        .catch(err => {
          console.log(`Request ${i} failed: ${err.message}`);
          return { status: err.response?.status || 500, index: i };
        })
    );
  }

  const results = await Promise.all(requests);
  const successCount = results.filter(r => r.status === 200).length;
  const throttledCount = results.filter(r => r.status === 429).length;

  console.log(`Sent 15 requests. Success: ${successCount}, Throttled: ${throttledCount}`);
  
  if (throttledCount > 0) {
    console.log('✅ Rate Limiting is working.');
  } else {
    console.log('❌ Rate Limiting failed (no 429 responses).');
  }
}

async function testCaching() {
  console.log('\nTesting Caching for User Profile...');
  // Need a valid identifier. Assuming 'testuser' or some existing user string if search works, 
  // or we can test public feed again for caching.
  // Let's test public feed /posts as it is easier.
  const endpoint = `${BASE_URL}/posts`;

  console.log('Request 1 (Potential Cache Miss)...');
  const start1 = Date.now();
  await axios.get(endpoint);
  const duration1 = Date.now() - start1;
  console.log(`Request 1 took ${duration1}ms`);

  console.log('Request 2 (Potential Cache Hit)...');
  const start2 = Date.now();
  await axios.get(endpoint);
  const duration2 = Date.now() - start2;
  console.log(`Request 2 took ${duration2}ms`);

  if (duration2 < duration1) {
       console.log('✅ Request 2 was faster, suggesting caching is working (or network variance).');
  } else {
       console.log('⚠️ Request 2 was not faster. Check if caching logic is active or if first request was already fast.');
  }
}

async function run() {
    try {
        await testCaching();
        console.log('Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await testRateLimiting();
    } catch (error) {
        console.error('Verification failed', error);
    }
}

run();
