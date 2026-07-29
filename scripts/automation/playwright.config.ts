import type { LaunchOptions } from 'playwright';

export const AUTOMATION_CONFIG = {
  headless: true,
  slowMo: 500,
  timeout: 60_000,
  viewport: { width: 1366, height: 768 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  retryDelayMs: 2000,
  maxRetries: 3,
};

export const LAUNCH_OPTIONS: LaunchOptions = {
  headless: AUTOMATION_CONFIG.headless,
  slowMo: AUTOMATION_CONFIG.slowMo,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
};
