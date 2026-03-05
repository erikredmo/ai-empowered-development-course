import { test, expect } from '@playwright/test';

// Force light color scheme so system preference doesn't affect initial state
test.use({ colorScheme: 'light' });

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('starts in light mode when no preference is saved', async ({ page }) => {
  const theme = await page.locator('html').getAttribute('data-theme');
  expect(theme).toBeNull();
});

test('toggle button shows moon icon in light mode', async ({ page }) => {
  await expect(page.locator('#darkModeToggle')).toContainText('🌙');
});

test('clicking toggle enables dark mode and sets data-theme attribute', async ({ page }) => {
  await page.click('#darkModeToggle');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('toggle button shows sun icon when dark mode is active', async ({ page }) => {
  await page.click('#darkModeToggle');

  await expect(page.locator('#darkModeToggle')).toContainText('☀️');
});

test('dark mode preference persists after page reload', async ({ page }) => {
  await page.click('#darkModeToggle');

  await page.reload();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('clicking toggle again disables dark mode', async ({ page }) => {
  await page.click('#darkModeToggle'); // enable dark
  await page.click('#darkModeToggle'); // back to light

  const theme = await page.locator('html').getAttribute('data-theme');
  expect(theme).toBeNull();
});

test('light mode preference persists after reload when explicitly set', async ({ page }) => {
  // Toggle dark then back to light — light is now explicitly saved
  await page.click('#darkModeToggle');
  await page.click('#darkModeToggle');

  await page.reload();

  const theme = await page.locator('html').getAttribute('data-theme');
  expect(theme).toBeNull();
});

test('notes textarea is visible and usable in dark mode', async ({ page }) => {
  // Add a todo and expand it
  await page.fill('#todoInput', 'Dark mode test todo');
  await page.click('#addBtn');
  await page.locator('.todo-expand').first().click();

  // Enable dark mode
  await page.click('#darkModeToggle');

  await expect(page.locator('.todo-notes')).toBeVisible();
});
