import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5189',
    browserName: 'chromium',
    viewport: { width: 1440, height: 1100 },
  },
  webServer: {
    command: 'npm run dev -- --port 5189 --strictPort',
    url: 'http://localhost:5189',
    reuseExistingServer: false,
  },
});
