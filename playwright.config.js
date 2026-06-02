const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 120000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    baseURL: 'http://localhost:3000',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
