import { test, expect } from '@playwright/test';

test('main - default view', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('main-default.png');
});

// Open the task modal via the "+ タスク追加" toolbar button.
// Initial projects=[] means there are no rows to click — the toolbar button is the
// only reliable way to surface the modal so we can detect visual regressions in it.
test('main - task modal open', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('button.btn-add-task').click();
  await page.waitForTimeout(500);
  await expect(page).toHaveScreenshot('main-modal-open.png');
});
