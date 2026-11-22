import { test, expect } from '@playwright/test';
import {
  CREDIT_WALLET_NAME,
  createWallet,
  getAccessToken,
  registerUniqueUser,
} from './helpers';

test('credit wallet badge and outstanding/available/utilization stats', async ({
  page,
  request,
}) => {
  await registerUniqueUser(page);

  await createWallet(page, {
    name: CREDIT_WALLET_NAME,
    type: 'credit',
    creditLimit: '10000000',
    closingDay: '25',
    dueDay: '10',
  });

  const cardName = page.getByText(CREDIT_WALLET_NAME, { exact: true });
  await expect(cardName.locator('..').getByText('Credit', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'New wallet' }).click();
  await expect(page.getByText('Credit limit')).toHaveCount(0);
  await expect(page.getByText('Closing day')).toHaveCount(0);
  await expect(page.getByText('Due day')).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();

  const token = await getAccessToken(page);
  const auth = { Authorization: `Bearer ${token}` };

  const listRes = await request.get('/api/wallets', { headers: auth });
  expect(listRes.ok()).toBeTruthy();
  const wallets: Array<{ id: string; name: string }> = await listRes.json();
  const wallet = wallets.find((w) => w.name === CREDIT_WALLET_NAME);
  expect(wallet).toBeTruthy();

  const expenseRes = await request.post(`/api/wallets/${wallet!.id}/transactions`, {
    headers: auth,
    data: {
      type: 'expense',
      amount: 1000000,
      category_name: 'E2E Purchase',
      description: 'e2e expense',
    },
  });
  expect(expenseRes.status()).toBe(201);

  const incomeRes = await request.post(`/api/wallets/${wallet!.id}/transactions`, {
    headers: auth,
    data: {
      type: 'income',
      amount: 500000,
      category_name: 'E2E Payment',
      description: 'payment',
    },
  });
  expect(incomeRes.status()).toBe(201);

  await page.goto(`/wallets/${wallet!.id}`);

  const stat = (label: string) => page.getByText(label, { exact: true }).locator('..');
  await expect(stat('Outstanding').getByText('$500,000.00')).toBeVisible();
  await expect(stat('Available credit').getByText('$9,500,000.00')).toBeVisible();
  await expect(stat('Utilization').getByText('5%', { exact: true })).toBeVisible();
});
