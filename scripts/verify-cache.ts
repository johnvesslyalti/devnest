
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function verifyCache() {
  console.log('Starting cache verification...');

  // 1. Register a new user to get valid token
  const email = `cache.test.${Date.now()}@example.com`;
  const password = 'Password@123';
  const username = `cacheuser_${Date.now()}`;

  try {
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        username,
        name: 'Cache Test User'
    });
    const { accessToken } = regRes.data;
    console.log('User registered, got token.');

    // 2. Call me endpoint - 1st time
    console.log('Calling me endpoint (1st time)...');
    const start1 = Date.now();
    await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(`1st call took ${Date.now() - start1}ms`);

    // 3. Call me endpoint - 2nd time
    console.log('Calling me endpoint (2nd time)...');
    const start2 = Date.now();
    await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(`2nd call took ${Date.now() - start2}ms`);
    
    console.log('Cache verification requests sent.');

  } catch (e: any) {
    console.error('Error:', e.response?.data || e.message);
    if (e.response?.status === 429) {
        console.error('Rate limited! Wait a minute.');
    }
  }
}

verifyCache();
