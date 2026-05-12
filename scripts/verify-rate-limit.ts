
import axios from 'axios';

const API_URL = 'http://localhost:3000/api/v1/auth/login';

async function testRateLimit() {
  console.log('Testing rate limiting...');
  
  const credentials = {
    email: 'test@example.com',
    password: 'password123'
  };

  let successCount = 0;
  let blockedCount = 0;

  for (let i = 0; i < 15; i++) {
    try {
      await axios.post(API_URL, credentials);
      console.log(`Request ${i + 1}: Success`);
      successCount++;
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        console.log(`Request ${i + 1}: Blocked (429 Too Many Requests)`);
        blockedCount++;
      } else {
        console.log(`Request ${i + 1}: Failed with status ${error.response?.status}`);
      }
    }
  }

  console.log('--- Summary ---');
  console.log(`Successful requests: ${successCount}`);
  console.log(`Blocked requests: ${blockedCount}`);

  if (blockedCount > 0) {
    console.log('✅ Rate limiting is working.');
  } else {
    console.error('❌ Rate limiting NOT detected.');
    process.exit(1);
  }
}

testRateLimit();
