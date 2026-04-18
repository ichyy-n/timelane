import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/vrt',
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'on',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30000,
  },
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
});
