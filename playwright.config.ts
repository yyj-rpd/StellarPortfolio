﻿import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true, workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173', channel: process.env.PLAYWRIGHT_CHANNEL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: {width:1440,height:900} } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: {width:360,height:800}, isMobile:true, hasTouch:true } },
    { name: 'tablet', use: { ...devices['Desktop Chrome'], viewport: {width:768,height:1024} } }
  ],
  webServer: { command: 'npm run build -- --outDir node_modules/.cache/stellar-e2e-site && npm run preview -- --outDir node_modules/.cache/stellar-e2e-site', url: 'http://127.0.0.1:4173', reuseExistingServer: false, env: { VITE_SUPABASE_URL: 'https://stellar-e2e.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only_not_real' } }
});



