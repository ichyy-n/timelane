import { test, expect } from '@playwright/test';

test('main - default view', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('main-default.png');
});

test('main - task modal', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const firstTask = page
    .locator('[data-task-id], .task-list-row, .task-row, .task-item')
    .first();
  if (await firstTask.isVisible()) {
    await firstTask.click();
    await page.waitForTimeout(500);
  }
  await expect(page).toHaveScreenshot('main-modal.png');
});
