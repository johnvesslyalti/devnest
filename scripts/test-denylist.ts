import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('Starting Denylist Verification...\n');
  
  const email = `test.denylist.${Date.now()}@example.com`;
  const password = 'Password@123';
  const username = `test_deny_${Date.now()}`;

  // 1. Register
  console.log('1. Registering new user...');
  let res;
  try {
    res = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        username,
        name: 'Test Denylist User'
    });
    console.log('   Register success');
  } catch (e: any) {
    console.error('   Register failed:', e.response?.data || e.message);
    process.exit(1);
  }

  const initialAccessToken = res.data.accessToken;
  const cookies = res.headers['set-cookie'];
  const refreshTokenCookie = cookies?.find((c: string) => c.startsWith('refreshToken='));
  const refreshToken = refreshTokenCookie?.split(';')[0].split('=')[1];

  console.log(`   Tokens received.`);

  // 2. Access Protected Route (Before Logout)
  console.log('\n2. Accessing Protected Route (Before Logout)...');
  try {
      res = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${initialAccessToken}` }
      });
      console.log('   Success! User data retrieved:', res.data.data.username);
  } catch (e: any) {
      console.error('   Access failed unexpectedly:', e.response?.data || e.message);
      process.exit(1);
  }

  // 3. Logout (Should add token to denylist)
  console.log('\n3. Logging out (adding access token to denylist)...');
  try {
      res = await axios.post(`${BASE_URL}/auth/logout`, {}, {
          headers: { 
            Authorization: `Bearer ${initialAccessToken}`,
            Cookie: `refreshToken=${refreshToken}` 
          }
      });
      console.log('   Logged out successfully');
  } catch (e: any) {
      console.error('   Logout failed:', e.response?.data || e.message);
      process.exit(1);
  }

  // 4. Access Protected Route (After Logout)
  console.log('\n4. Accessing Protected Route (After Logout) - Expected to FAIL...');
  try {
      res = await axios.get(`${BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${initialAccessToken}` }
      });
      console.error('   FAILURE: Server accepted a denylisted token!');
      process.exit(1);
  } catch (e: any) {
      if (e.response?.status === 401 && e.response?.data?.message === 'Token has been revoked') {
          console.log(`   SUCCESS: Access denied properly with expected message: "${e.response?.data?.message}"`);
      } else {
          console.error('   Unexpected error or message:', e.response?.status, e.response?.data);
          process.exit(1);
      }
  }

  console.log('\nVerification Complete! Token denylist works flawlessly.');
}

main().catch(console.error);
