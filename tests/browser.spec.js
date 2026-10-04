import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Good things grow in pairs.' }),
  ).toBeVisible();
});

test('plant, mark, undo, check, and reset a garden', async ({ page }) => {
  const cell = page.locator('.cell:not(.given)').first();
  await cell.click();
  await expect(cell).toHaveClass(/planted/);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(cell).not.toHaveClass(/planted/);
  await cell.click({ button: 'right' });
  await expect(cell).toHaveClass(/marked/);
  await page.getByRole('button', { name: 'Mark empty', exact: true }).click();
  await cell.click();
  await expect(cell).not.toHaveClass(/marked/);
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('right place');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Reset garden', exact: true }).click();
  await expect(page.locator('.cell.planted:not(.given)')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeDisabled();
});

test('free-play difficulty and progress survive reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Free play', exact: true }).click();
  await page.getByLabel('Puzzle difficulty').selectOption('tricky');
  const cell = page.locator('.cell:not(.given)').first();
  const index = await cell.getAttribute('data-index');
  await cell.click();
  const clues = await page.locator('.clue').allTextContents();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Room for another bloom' }),
  ).toBeVisible();
  await expect(page.getByLabel('Puzzle difficulty')).toHaveValue('tricky');
  await expect(page.locator(`[data-index="${index}"]`)).toHaveClass(/planted/);
  expect(await page.locator('.clue').allTextContents()).toEqual(clues);
  await page.getByRole('button', { name: 'Daily garden', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'A moment to bloom' }),
  ).toBeVisible();
});

test('hints lead to a completed garden and a new game', async ({ page }) => {
  const progress = await page.locator('.game-meta').innerText();
  const [planted, total] = progress.match(/\d+/g).map(Number);
  for (let i = planted; i < total; i++) {
    await page
      .getByRole('button', { name: 'A little hint', exact: true })
      .click();
    await expect(page.locator('.game-meta')).toContainText(
      `${i + 1} of ${total} flowers`,
    );
  }
  await expect(
    page.getByRole('heading', { name: 'A garden in full bloom.' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Admire my garden', exact: true })
    .click();
  await expect(page.locator('.solved-banner')).toBeVisible();
  await page.getByRole('button', { name: 'Grow another', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Room for another bloom' }),
  ).toBeVisible();
  await expect(page.locator('.solved-banner')).toHaveCount(0);
});

test('keyboard controls and modal focus are usable', async ({ page }) => {
  const cell = page.locator('.cell:not(.given)').first();
  await cell.focus();
  await page.keyboard.press('Enter');
  await expect(cell).toHaveClass(/planted/);
  await page.keyboard.press('x');
  await expect(cell).toHaveClass(/marked/);
  await page.keyboard.press('Delete');
  await expect(cell).not.toHaveClass(/marked/);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.cell:focus')).toHaveCount(1);
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Close dialog' }),
  ).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(
    page.getByRole('button', { name: 'Ready to bloom' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'How to play', exact: true }),
  ).toBeFocused();
});

test('mobile board fits and supports touch marking', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
  const bounds = await page.locator('.board-shell').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(375);
  await page.getByRole('button', { name: 'Mark empty', exact: true }).click();
  const cell = page.locator('.cell:not(.given)').first();
  await cell.click();
  await expect(cell).toHaveClass(/marked/);
  await page.getByRole('button', { name: 'How to play', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    375,
  );
});

test('invalid storage does not prevent playing', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('petal-active-garden-v1', '{not-json');
    localStorage.setItem('petal-gardens-v1', '{not-json');
  });
  await page.reload();
  await expect(page.locator('.cell')).toHaveCount(36);
  await page.locator('.cell:not(.given)').first().click();
  await expect(page.locator('.cell.planted:not(.given)')).toHaveCount(1);
});

test('arrow navigation stays in its row and column at board boundaries', async ({
  page,
}) => {
  for (const [index, key] of [
    [5, 'ArrowRight'],
    [6, 'ArrowLeft'],
    [31, 'ArrowDown'],
    [3, 'ArrowUp'],
  ]) {
    const cell = page.locator(`[data-index="${index}"]`);
    await cell.focus();
    await page.keyboard.press(key);
    await expect(cell).toBeFocused();
  }
});

test('hints announce coordinates and cells expose their governing clues', async ({
  page,
}) => {
  await expect(page.locator('.cell').first()).toHaveAccessibleDescription(
    /Row needs \d flowers; column needs \d flowers/,
  );
  await page
    .getByRole('button', { name: 'A little hint', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(/Row \d, column \d/);
  await expect(page.locator('.cell.hinted')).toHaveAccessibleName(
    /revealed by a hint/,
  );
});

test('narrow phone viewport has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});

test('check identifies an incorrect cell without changing the board', async ({
  page,
}) => {
  const emptyIndex = await page.evaluate(async () => {
    const { createPuzzle } = await import('/src/game.js');
    const saved = JSON.parse(localStorage.getItem('petal-active-garden-v1'));
    const puzzle = createPuzzle(saved.seed, saved.difficulty);
    return puzzle.solution.findIndex(
      (value, index) => value === -1 && !puzzle.givens[index],
    );
  });
  const cell = page.locator(`[data-index="${emptyIndex}"]`);
  await cell.click();
  await page.getByRole('button', { name: 'Check', exact: true }).click();
  await expect(cell).toHaveClass(/incorrect/);
  await expect(cell).toHaveAccessibleName(/incorrect/);
  await expect(page.getByRole('status')).toContainText(
    '1 cell needs another look',
  );
});

test('daily progress returns after playing a different garden', async ({
  page,
}) => {
  const cell = page.locator('.cell:not(.given)').first();
  const index = await cell.getAttribute('data-index');
  await cell.click();
  await page.getByRole('button', { name: 'Free play', exact: true }).click();
  await page.getByRole('button', { name: 'Daily garden', exact: true }).click();
  await expect(page.locator(`[data-index="${index}"]`)).toHaveClass(/planted/);
});

test('after midnight the current board keeps its date and daily navigation opens today', async ({
  page,
}) => {
  await page.clock.install({ time: new Date(2026, 0, 15, 23, 59, 50) });
  await page.reload();
  await expect(page.locator('.garden-label')).toContainText('January 15');
  await page.clock.setSystemTime(new Date(2026, 0, 16, 0, 0, 10));
  await page.getByRole('button', { name: 'Daily garden', exact: true }).click();
  await expect(page.locator('.garden-label')).toContainText('January 16');
});

test('sound can be enabled and disabled without runtime errors', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.getByRole('button', { name: 'Turn sound on' }).click();
  await expect(
    page.getByRole('button', { name: 'Turn sound off' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.cell:not(.given)').first().click();
  await page.getByRole('button', { name: 'Turn sound off' }).click();
  await expect(
    page.getByRole('button', { name: 'Turn sound on' }),
  ).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
