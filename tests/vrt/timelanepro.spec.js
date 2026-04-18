import { test, expect } from '@playwright/test';

test('TimelanePro - default view', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('timelane-default.png');
});

test('TimelanePro - task modal', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  const addBtn = page.getByRole('button', { name: /タスク追加/ }).first();
  await addBtn.click();
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot('timelane-modal.png');
});
