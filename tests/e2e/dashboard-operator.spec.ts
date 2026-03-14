import { expect, test } from '@playwright/test';

test('demo scenario: agent reviews dashboard, tickets, and live monitor states', async ({ page }) => {
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Priority Tickets')).toBeVisible();

  await page.getByRole('link', { name: 'Tickets' }).click();
  await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();

  await page.getByRole('button', { name: /Billing discrepancy last month|Duplicate charge/ }).first().click();
  await expect(page.getByText('AI Summary')).toBeVisible();
  await expect(page.getByText('AI Reasoning & Actions')).toBeVisible();

  await page.getByRole('link', { name: 'Live Conversations' }).click();
  await expect(page.getByRole('heading', { name: 'Live Conversations' })).toBeVisible();
  await expect(page.getByText(/No active conversations|Active Queue/)).toBeVisible();
});
