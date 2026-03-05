import { test, expect } from '@playwright/test';

async function addTodo(page, text, dueDate = null) {
  await page.fill('#todoInput', text);
  if (dueDate) {
    await page.fill('#dueDateInput', dueDate);
  }
  await page.click('#addBtn');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('filters todos by title in real time', async ({ page }) => {
  await addTodo(page, 'Buy groceries');
  await addTodo(page, 'Read book');

  await page.fill('#searchInput', 'buy');

  const items = page.locator('#todoList li:not(.empty-message)');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Buy groceries');
});

test('filters todos by notes content', async ({ page }) => {
  await addTodo(page, 'First todo');
  await addTodo(page, 'Second todo');

  // Expand first todo and add a note
  await page.locator('.todo-expand').first().click();
  await page.fill('.todo-notes', 'important meeting details');

  await page.fill('#searchInput', 'important meeting');

  const items = page.locator('#todoList li:not(.empty-message)');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('First todo');
});

test('search combined with Active filter shows only active matches', async ({ page }) => {
  await addTodo(page, 'Active task with keyword');
  await addTodo(page, 'Another active keyword task');

  // Complete the second todo
  await page.locator('.todo-checkbox').nth(1).check();

  // Switch to Active filter
  await page.click('.filter-btn[data-filter="active"]');

  await page.fill('#searchInput', 'keyword');

  const items = page.locator('#todoList li:not(.empty-message)');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('Active task with keyword');
});

test('search combined with sort by due date preserves order', async ({ page }) => {
  await addTodo(page, 'Banana task', '2030-12-01');
  await addTodo(page, 'Apple task', '2030-06-01');
  await addTodo(page, 'Unrelated todo');

  await page.click('#sortBtn');
  await page.fill('#searchInput', 'task');

  const items = page.locator('#todoList li:not(.empty-message)');
  await expect(items).toHaveCount(2);
  // Apple task (June) should appear before Banana task (December) when sorted
  await expect(items.first()).toContainText('Apple task');
  await expect(items.nth(1)).toContainText('Banana task');
});

test('clear button resets search and shows all todos', async ({ page }) => {
  await addTodo(page, 'Todo one');
  await addTodo(page, 'Todo two');

  await page.fill('#searchInput', 'one');
  await expect(page.locator('#todoList li:not(.empty-message)')).toHaveCount(1);

  await page.click('#clearSearchBtn');

  await expect(page.locator('#searchInput')).toHaveValue('');
  await expect(page.locator('#todoList li:not(.empty-message)')).toHaveCount(2);
});

test('shows "No matches found" when search has no results', async ({ page }) => {
  await addTodo(page, 'Todo one');

  await page.fill('#searchInput', 'xyz123doesnotexist');

  await expect(page.locator('#todoList .empty-message')).toContainText('No matches found');
});

test('search is case-insensitive', async ({ page }) => {
  await addTodo(page, 'Hello World');

  await page.fill('#searchInput', 'hello world');
  await expect(page.locator('#todoList li:not(.empty-message)')).toHaveCount(1);

  await page.fill('#searchInput', 'HELLO WORLD');
  await expect(page.locator('#todoList li:not(.empty-message)')).toHaveCount(1);

  await page.fill('#searchInput', 'HeLLo WoRLd');
  await expect(page.locator('#todoList li:not(.empty-message)')).toHaveCount(1);
});
