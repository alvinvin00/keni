import { test, expect } from '@playwright/test';
import { createWallet, getAccessToken, registerUniqueUser } from './helpers';

const CC_WALLET_NAME = 'CC Card';

test('transfer Main to CC: stats hide it, default list hides it, transfers filter shows it', async ({
  page,
  request,
}) => {
  await registerUniqueUser(page);

  await createWallet(page, {
    name: CC_WALLET_NAME,
    type: 'credit',
    creditLimit: '10000000',
    closingDay: '25',
    dueDay: '10',
  });

  const token = await getAccessToken(page);
  const auth = { Authorization: `Bearer ${token}` };

  const walletsRes = await request.get('/api/wallets', { headers: auth });
  expect(walletsRes.ok()).toBeTruthy();
  const wallets: Array<{ id: string; name: string }> = await walletsRes.json();
  const mainWallet = wallets.find((w) => w.name === 'Main Wallet');
  const ccWallet = wallets.find((w) => w.name === CC_WALLET_NAME);
  expect(mainWallet).toBeTruthy();
  expect(ccWallet).toBeTruthy();

  const expenseRes = await request.post(`/api/wallets/${ccWallet!.id}/transactions`, {
    headers: auth,
    data: {
      type: 'expense',
      amount: 1000000,
      category_name: 'E2E Purchase',
      description: 'e2e cc purchase',
    },
  });
  expect(expenseRes.status()).toBe(201);

  await page.goto(`/wallets/${mainWallet!.id}`);
  const transferButton = page.getByRole('button', { name: 'Transfer', exact: true });
  await expect(transferButton).toBeVisible();
  await transferButton.click();

  const modal = page.locator('.modal');
  await expect(modal).toBeVisible();
  await modal.locator('.ss-trigger').click();
  await page.getByRole('option', { name: CC_WALLET_NAME, exact: true }).click();
  await modal.locator('.input-group').filter({ hasText: 'Amount' }).locator('input').fill('500000');
  await modal.getByRole('button', { name: 'Transfer', exact: true }).click();
  await expect(page.getByText('Transfer created')).toBeVisible();

  await page.goto(`/wallets/${ccWallet!.id}`);
  const stat = (label: string) => page.getByText(label, { exact: true }).locator('..');
  await expect(stat('Outstanding').getByText('$500,000.00')).toBeVisible();
  await expect(stat('Available credit').getByText('$9,500,000.00')).toBeVisible();

  await page.goto(`/wallets/${mainWallet!.id}`);
  await expect(page.getByText('No transactions found')).toBeVisible();
  await expect(page.getByText(`→ ${CC_WALLET_NAME}`)).toHaveCount(0);

  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const typeGroup = page.locator('.input-group').filter({ hasText: 'Type' });
  await typeGroup.locator('.select-trigger').click();
  await page.getByRole('option', { name: 'Transfers', exact: true }).click();
  await expect(page.getByText(`→ ${CC_WALLET_NAME}`)).toBeVisible();

  const walletRes = await request.get(`/api/wallets/${mainWallet!.id}`, { headers: auth });
  expect(walletRes.ok()).toBeTruthy();
  const walletSummary = await walletRes.json();
  expect(walletSummary.total_expenses).toBe(0);
  expect(walletSummary.transfer_out).toBe(500000);
  expect(walletSummary.balance).toBe(-500000);

  const summaryRes = await request.get(
    `/api/wallets/${mainWallet!.id}/transactions/summary`,
    { headers: auth },
  );
  expect(summaryRes.ok()).toBeTruthy();
  const summary = await summaryRes.json();
  expect(summary.total_amount).toBe(0);
});
