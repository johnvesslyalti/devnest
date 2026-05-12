/**
 * Shared test configuration for E2E tests.
 * This helper provides a default database URL that works for most local development,
 * but can be overridden by environment variables in CI/CD environments.
 */
export const getTestDbUrl = (): string => {
  return (
    process.env.POSTGRES_URL ||
    'postgresql://postgres:3132@localhost:5432/devnest_test'
  );
};

export const getTestRedisUrl = (): string => {
  return process.env.REDIS_URL || 'redis://localhost:6379';
};
