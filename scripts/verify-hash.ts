
import { PrismaClient } from '@internal/postgres-client';
import axios from 'axios';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('Verifying IP Hashing...');
  
  const email = `test.hash.${Date.now()}@example.com`;
  const password = 'Password@123';
  const username = `testhash_${Date.now()}`;

  // Register
  try {
    await axios.post(`${BASE_URL}/auth/register`, {
        email,
        password,
        username,
        name: 'Hash Test'
    });
  } catch(e) { console.error('Register failed', e); }

  const user = await prisma.user.findFirst({
    where: { email },
  });

  console.log('Stored IP:', user?.lastLoginIp);
  
  // Check if it looks like a hash (hex string, likely 64 chars for sha256)
  const isHash = /^[a-f0-9]{64}$/.test(user?.lastLoginIp || '');
  
  if (isHash) {
      console.log('SUCCESS: IP is hashed.');
  } else {
      console.error('FAILURE: IP is NOT hashed (or format mismatch).');
      console.log('Value:', user?.lastLoginIp);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
