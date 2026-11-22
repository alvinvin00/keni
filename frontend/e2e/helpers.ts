import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const CREDIT_WALLET_NAME = 'E2E Credit Card';
export const DEBIT_WALLET_NAME = 'E2E Debit Wallet';

export async function registerUniqueUser(page: Page): Promise<void> {
  const email = `e2e+${Date.now()}@example.com`;
  await page.goto('/login');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await page.getByPlaceholder('username').fill(email);
  await page.getByPlaceholder('••••••••').fill('e2e-password');
  await page.getByPlaceholder('Your name').fill('E2E Tester');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

function inputByLabel(page: Page, label: string) {
  return page
    .locator('.input-group')
    .filter({ hasText: label })
    .locator('input');
}

export async function openCreateWalletModal(page: Page): Promise<void> {
  await page.goto('/wallets');
  await page.getByRole('button', { name: 'New wallet' }).click();
}

export async function createWallet(
  page: Page,
  opts: {
    name: string;
    type: 'debit' | 'credit';
    creditLimit?: string;
    closingDay?: string;
    dueDay?: string;
  },
): Promise<void> {
  await openCreateWalletModal(page);
  await page.getByPlaceholder('e.g. Main Wallet').fill(opts.name);
  if (opts.type === 'credit') {
    await page.getByRole('button', { name: 'Credit', exact: true }).click();
    await inputByLabel(page, 'Credit limit').fill(opts.creditLimit ?? '10000000');
    await inputByLabel(page, 'Closing day').fill(opts.closingDay ?? '25');
    await inputByLabel(page, 'Due day').fill(opts.dueDay ?? '10');
  }
  await page.getByRole('button', { name: 'Create wallet' }).click();
  await expect(page.getByText(opts.name, { exact: true })).toBeVisible();
}

export async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('access_token'));
  if (!token) throw new Error('access_token missing from localStorage');
  return token;
}
