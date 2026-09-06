import { defineConfig, devices } from '@playwright/test';

const publicBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const evidenceDir = process.env.PLAYWRIGHT_EVIDENCE_DIR;

export default defineConfig({
  testDir: './tests',
  outputDir: evidenceDir ?? 'test-results',
  timeout: 30_000,
  expect: { timeout: 6_000 },
  fullyParallel: false,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: publicBaseURL ?? 'http://127.0.0.1:4173',
    trace: evidenceDir ? 'on' : 'retain-on-failure',
    screenshot: evidenceDir ? 'on' : 'only-on-failure',
    video: evidenceDir ? 'on' : 'off'
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['iPhone 13'], browserName: 'chromium' } }
  ],
  webServer: publicBaseURL ? undefined : {
    command: 'PORT=4173 npm run preview',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
