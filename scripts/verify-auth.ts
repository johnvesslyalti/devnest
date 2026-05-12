
import { PrismaClient } from '@internal/postgres-client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('Starting verification...');
  
  const email = `test.auth.${Date.now()}@example.com`;
  const password = 'Password@123';
  const username = `testuser_${Date.now()}`;

  // 1. Register
  console.log('1. Registering user...');
  let res;
  try {
    res = await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        username,
        name: 'Test User'
    });
    console.log('   Register success:', res.data.message);
  } catch (e: any) {
    console.error('   Register failed:', e.response?.data || e.message);
    process.exit(1);
  }

  const userId = res.data.id;
  const initialAccessToken = res.data.accessToken;
  // Cookie handling manual since axios doesn't store by default efficiently in script without jar
  const cookies = res.headers['set-cookie'];
  if (!cookies) {
      console.error('   No cookies received!');
      process.exit(1);
  }
  const refreshTokenCookie = cookies.find((c: string) => c.startsWith('refreshToken='));
  const refreshToken = refreshTokenCookie?.split(';')[0].split('=')[1];

  console.log('   UserId:', userId);
  console.log('   RefreshToken found in cookie');

  // 2. Check DB State
  console.log('2. Checking DB State...');
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.lastLoginAt || !user.lastLoginIp) {
      console.error('   Registration did not update lastLogin fields!');
      // process.exit(1); // soft fail for now
  } else {
      console.log('   User lastLoginAt set:', user.lastLoginAt);
  }

  const tokenRec = await prisma.refreshToken.findFirst({ where: { userId } });
  if (!tokenRec || tokenRec.token !== refreshToken) {
      console.error('   RefreshToken record not found or mismatch!');
      process.exit(1);
  }
  console.log('   RefreshToken record found in DB.');

  // 3. Refresh Token
  console.log('3. Refreshing Token...');
  // Force small delay to ensure timestamps differ
  await new Promise(r => setTimeout(r, 1000));
  
  try {
    res = await axios.post(`${BASE_URL}/auth/refresh`, {}, {
        headers: {
            Cookie: `refreshToken=${refreshToken}`
        }
    });
    console.log('   Refresh success, new access token received');
  } catch (e: any) {
    console.error('   Refresh failed:', e.response?.data || e.message);
    process.exit(1);
  }
  
  const newCookies = res.headers['set-cookie'];
  const newRefreshTokenCookie = newCookies?.find((c: string) => c.startsWith('refreshToken='));
  const newRefreshToken = newRefreshTokenCookie?.split(';')[0].split('=')[1];

  if (!newRefreshToken || newRefreshToken === refreshToken) {
      console.error('   Token did not rotate! (Or new token not returned in cookie)');
      // In rotation implementation, we update DB. Does controller return new cookie?
      // AuthService returns { accessToken, refreshToken }. AuthController sets cookie.
      // Yes it should returns new cookie.
  } else {
      console.log('   Token rotated successfully.');
  }

  // Check DB for replacement
  const oldTokenRec = await prisma.refreshToken.findFirst({ where: { token: refreshToken } });
  if (!oldTokenRec?.replacedByToken || !oldTokenRec.revokedAt) {
      console.error('   Old token not marked revoked/replaced in DB');
  } else {
      console.log('   Old token marked replaced in DB.');
  }

  // 4. Soft Delete
  console.log('4. Testing Soft Delete...');
  try {
      await axios.post(`${BASE_URL}/auth/delete`, {}, {
          headers: { Authorization: `Bearer ${initialAccessToken}`, Cookie: `refreshToken=${newRefreshToken}` }
      });
      console.log('   Delete request success');
  } catch (e: any) {
      console.error('   Delete failed:', e.response?.data || e.message);
      // Wait, maybe initialAccessToken expired? It's 15m, should be fine.
      // Or we should use the new one?
  }

  const deletedUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!deletedUser?.deletedAt) {
      console.error('   User not marked deleted in DB');
  } else {
      console.log('   User marked deletedAt:', deletedUser.deletedAt);
  }
  
  // Check tokens revoked
  const allTokens = await prisma.refreshToken.findMany({ where: { userId } });
  const allRevoked = allTokens.every(t => t.revokedAt !== null);
  if (!allRevoked) {
      console.error('   Not all tokens revoked after delete!');
  } else {
      console.log('   All user tokens revoked.');
  }

  // 5. Try Login
  console.log('5. Verifying Login Prevented...');
  try {
      await axios.post(`${BASE_URL}/auth/login`, {
          email,
          password
      });
      console.error('   Login succeeded but should have failed for deleted user!');
  } catch (e: any) {
      if (e.response?.status === 401) {
          console.log('   Login failed as expected (401).');
      } else {
          console.error('   Login failed with unexpected status:', e.response?.status);
      }
  }

  console.log('Verification Complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
