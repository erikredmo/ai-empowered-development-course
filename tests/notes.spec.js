import { test, expect } from '@playwright/test';

async function addTodo(page, text) {
  await page.fill('#todoInput', text);
  await page.click('#addBtn');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('clicking expand button shows notes textarea', async ({ page }) => {
  await addTodo(page, 'My todo');

  await page.locator('.todo-expand').first().click();

  await expect(page.locator('.todo-details')).toBeVisible();
  await expect(page.locator('.todo-notes')).toBeVisible();
});

test('only one todo is expanded at a time', async ({ page }) => {
  await addTodo(page, 'First todo');
  await addTodo(page, 'Second todo');

  // Expand first todo
  await page.locator('.todo-expand').first().click();
  await expect(page.locator('.todo-details')).toHaveCount(1);

  // Expand second todo — first should collapse
  await page.locator('.todo-expand').nth(1).click();
  await expect(page.locator('.todo-details')).toHaveCount(1);
  await expect(page.locator('.todo-details')).toBeVisible();
});

test('notes are saved to localStorage on input', async ({ page }) => {
  await addTodo(page, 'My todo');

  await page.locator('.todo-expand').first().click();
  await page.fill('.todo-notes', 'Important note content');

  const stored = await page.evaluate(() => {
    const notes = JSON.parse(localStorage.getItem('todoNotes') || '{}');
    return Object.values(notes)[0];
  });
  expect(stored).toBe('Important note content');
});

test('notes persist after page reload', async ({ page }) => {
  await addTodo(page, 'My todo');

  await page.locator('.todo-expand').first().click();
  await page.fill('.todo-notes', 'Persistent note');

  await page.reload();

  // Re-expand the todo
  await page.locator('.todo-expand').first().click();

  await expect(page.locator('.todo-notes')).toHaveValue('Persistent note');
});

test('todos with matching notes appear in search results', async ({ page }) => {
  await addTodo(page, 'First todo');
  await addTodo(page, 'Second todo');

  // Add notes to first todo
  await page.locator('.todo-expand').first().click();
  await page.fill('.todo-notes', 'unique note keyword');

  await page.fill('#searchInput', 'unique note keyword');

  const items = page.locator('#todoList li:not(.empty-message)');
  await expect(items).toHaveCount(1);
  await expect(items.first()).toContainText('First todo');
});

test('deleting a todo removes its notes from localStorage', async ({ page }) => {
  await addTodo(page, 'My todo');

  await page.locator('.todo-expand').first().click();
  await page.fill('.todo-notes', 'Note to be deleted');

  // Get the todo id from DOM before deletion
  const todoId = await page.locator('#todoList .todo-item').first().getAttribute('data-todo-id');

  await page.locator('.todo-delete').first().click();

  const notes = await page.evaluate(() => JSON.parse(localStorage.getItem('todoNotes') || '{}'));
  expect(notes[todoId]).toBeUndefined();
});

test('clicking expand again collapses the todo', async ({ page }) => {
  await addTodo(page, 'My todo');

  await page.locator('.todo-expand').first().click();
  await expect(page.locator('.todo-details')).toBeVisible();

  await page.locator('.todo-expand').first().click();
  await expect(page.locator('.todo-details')).not.toBeVisible();
});
