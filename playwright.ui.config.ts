import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL: 'http://localhost:5867',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'npm run dev:frontend',
      port: 5867,
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
