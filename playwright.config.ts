import { defineConfig, devices } from '@playwright/test';
import { ADMIN_STATE } from './tests/helpers/env';

try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the process environment (CI).
}

const baseURL = process.env.MWIS_BASE_URL ?? 'http://localhost:3100';
const isCI = !!process.env.CI;


export default defineConfig({
  testDir: './tests',
  // MWIS rate-limits sign-ins to 10 per IP per 3 minutes and tests share one
  // database, so run serially.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      testIgnore: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'], storageState: ADMIN_STATE },
      dependencies: ['setup'],
    },
  ],
});
