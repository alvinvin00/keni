import { test, expect } from '@playwright/test';
import { DEBIT_WALLET_NAME, createWallet, registerUniqueUser } from './helpers';

test('register a unique user and create a debit wallet', async ({ page }) => {
  await registerUniqueUser(page);

  await createWallet(page, { name: DEBIT_WALLET_NAME, type: 'debit' });

  await expect(page.getByText(DEBIT_WALLET_NAME, { exact: true })).toBeVisible();
  await expect(page.getByText('Credit', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: 'New wallet' }).click();
  await expect(page.getByText('Credit limit')).toHaveCount(0);
  await expect(page.getByText('Closing day')).toHaveCount(0);
  await expect(page.getByText('Due day')).toHaveCount(0);
});
