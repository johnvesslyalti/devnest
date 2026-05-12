import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

export const options = {
  stages: [
    { duration: '10s', target: 50 }, // Ramp up to 50 users
    { duration: '20s', target: 100 }, // Stay at 100 users
    { duration: '10s', target: 0 }, // Ramp down
  ],
};

const BASE_URL = 'http://localhost:3000/api/v1';

export default function () {
  // 1. Generate unique user data
  const uniqueId = randomString(8) + `_${__VU}_${__ITER}`;
  const user = {
    name: 'Test User',
    username: `user_${uniqueId}`,
    email: `user_${uniqueId}@example.com`,
    password: 'password123',
  };

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // 2. Register
  const registerRes = http.post(`${BASE_URL}/auth/register`, JSON.stringify(user), params);
  check(registerRes, {
    'register status is 201': (r) => r.status === 201,
    'has access token from register': (r) => r.json('accessToken') !== undefined,
  });

  sleep(0.5);

  // 3. Login
  const loginPayload = {
    email: user.email,
    password: user.password,
  };
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify(loginPayload), params);
  check(loginRes, {
    'login status is 201': (r) => r.status === 201 || r.status === 200,
    'has access token from login': (r) => r.json('accessToken') !== undefined,
  });

  const accessToken = loginRes.json('accessToken') || registerRes.json('accessToken');

  sleep(0.5);

  if (accessToken) {
    // 4. Create Post
    const authParams = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    };
    
    const postPayload = {
      content: `This is an automated test post by ${user.username}!`,
    };

    const postRes = http.post(`${BASE_URL}/posts`, JSON.stringify(postPayload), authParams);
    check(postRes, {
      'create post status is 201': (r) => r.status === 201,
    });
  }

  sleep(1);
}
