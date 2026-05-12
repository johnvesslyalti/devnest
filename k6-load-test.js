import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '20s', target: 1000 },
    { duration: '20s', target: 3000 },
    { duration: '20s', target: 5000 },
    { duration: '10s', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:3000/api/v1/health');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'status is ok': (r) => r.json().status === 'ok',
  });
  sleep(1);
}
