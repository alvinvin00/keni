import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    video: process.env.E2E_VIDEO ? 'on' : 'off',
  },
  webServer: [
    {
      command: 'uv run uvicorn main:app --port 8000',
      cwd: '../backend',
      url: 'http://localhost:8000/docs',
      env: {
        DATABASE_URL: 'postgresql+asyncpg://keni@127.0.0.1:5432/keni',
        SECRET_KEY: 'e2e-secret',
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'bun dev',
      cwd: '.',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
