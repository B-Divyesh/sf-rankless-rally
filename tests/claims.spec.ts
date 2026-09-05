import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const winningRoute = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp']) {
    await page.keyboard.press(key);
  }
  await expect(page.getByRole('heading', { name: 'You reached the exit' })).toBeVisible();
};

test('@claim:complete-run finishes a routed board with a score card', async ({ page }) => {
  await page.goto('/demo');
  await winningRoute(page);
  await expect(page.getByLabel('This run')).toContainText('speed left');
  await expect(page.getByLabel('This run')).toContainText('elegance');
  await expect(page.getByLabel('This run')).toContainText('rescues');
});

test('@claim:ninety-second-run starts a standard board at ninety seconds', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByTestId('timer')).toHaveText('1:30');
});

test('@claim:free-no-account starts sample play without a sign-in or payment step', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  await expect(page.getByRole('button', { name: 'Pause run' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('@claim:restart-reset clears a completed route for another run', async ({ page }) => {
  await page.goto('/demo');
  await winningRoute(page);
  await page.getByRole('button', { name: 'Play this board again' }).click();
  await expect(page.getByTestId('timer')).toHaveText('1:30');
  await expect(page.getByText('Relays 0/3')).toBeVisible();
  await expect(page.getByText('Rescues 0/3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start run' })).toBeVisible();
});

test('@claim:settings-persist saves assist and motion choices for the next visit', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Assist mode/ }).check();
  await page.getByRole('checkbox', { name: /Mute route sounds/ }).check();
  await page.getByRole('checkbox', { name: /Reduce movement/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('checkbox', { name: /Assist mode/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Mute route sounds/ })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: /Reduce movement/ })).toBeChecked();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByTestId('timer')).toHaveText('2:15');
});

test('@claim:assist-extra-time gives a new assisted run two minutes and fifteen seconds', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Assist mode/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByTestId('timer')).toHaveText('2:15');
});

test('@claim:demo-isolation resets sample data without changing a real run', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start run' }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByText('Relays 1/3')).toBeVisible();
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Demo reset. Your real game was not changed.')).toBeVisible();
  await page.goto('/');
  await expect(page.getByText('Relays 1/3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume run' })).toBeVisible();
});

test('@claim:keyboard-controls routes with Arrow keys and WASD', async ({ page }) => {
  await page.goto('/demo');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('d');
  await expect(page.getByText('Relay 1 connected.')).toBeVisible();
  await expect(page.getByText('Relays 1/3')).toBeVisible();
});

test('@claim:touch-controls routes with 44-pixel on-screen direction controls', async ({ page }, testInfo) => {
  await page.goto('/demo');
  const right = page.getByRole('button', { name: 'Move right' });
  const bounds = await right.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  if (testInfo.project.name === 'phone') {
    await right.tap();
    await right.tap();
  } else {
    await right.click();
    await right.click();
  }
  await expect(page.getByText('Relay 1 connected.')).toBeVisible();
});

test('@claim:pause-recovery restores an unfinished run after a refresh', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('p');
  await expect(page.getByRole('heading', { name: 'Run paused' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume run' })).toBeVisible();
});

test('@claim:shared-replay opens a completed route in an independent browser', async ({ page, browser }) => {
  await page.goto('/demo');
  await winningRoute(page);
  const code = await page.getByLabel('Completed replay code').inputValue();
  const friendContext = await browser.newContext();
  const friend = await friendContext.newPage();
  await friend.goto('/demo');
  await friend.getByLabel('Replay code').fill(code);
  await friend.getByRole('button', { name: 'Load replay code' }).click();
  await expect(friend.getByText('Shared route loaded.')).toBeVisible();
  await friend.getByRole('button', { name: 'Play shared route' }).click();
  await expect(friend.getByRole('img', { name: /Board Practice 01/ })).toBeVisible();
  await friendContext.close();
});

test('@claim:daily-and-archive provides one daily and twenty permanent boards', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('group', { name: 'Twenty permanent practice boards' }).getByRole('button')).toHaveCount(20);
  await page.getByRole('button', { name: 'Play today’s board' }).click();
  await expect(page.getByRole('heading', { name: /Daily board/ })).toBeVisible();
  await page.getByRole('button', { name: '01' }).click();
  await expect(page.getByRole('heading', { name: 'Practice 01' })).toBeVisible();
});

test('@claim:no-tracking makes no third-party requests during a sample run', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === 'http://127.0.0.1:4173')).toBeTruthy();
});

test('@claim:fixed-60hz uses a measured fixed update loop during active play', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  await page.waitForTimeout(1250);
  await expect(page.getByTestId('runtime-rate')).toHaveText(/(?:5[5-9]|6[0-5]) Hz update sample/);
});

test('handles blocked moves, invalid replay codes, pause recovery, routes, and serious accessibility issues', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/demo');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('That route is blocked. Choose another direction.')).toBeVisible();
  await page.getByLabel('Replay code').fill('not a replay');
  await page.getByRole('button', { name: 'Load replay code' }).click();
  await expect(page.getByText('This replay code is not valid. Paste a code that starts with RR1.')).toBeVisible();
  await page.keyboard.press('p');
  await expect(page.getByRole('heading', { name: 'Run paused' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume run' })).toBeVisible();
  await page.goto('/privacy');
  await expect(page).toHaveTitle('Privacy — Rankless Rally');
  await expect(page.getByRole('heading', { name: 'Keep puzzle progress in your browser' })).toBeVisible();
  await page.goto('/terms');
  await expect(page).toHaveTitle('Terms — Rankless Rally');
  await page.goto('/not-a-route');
  await expect(page.getByRole('heading', { name: 'Choose a board that exists' })).toBeVisible();
  await page.goto('/demo');
  const report = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = report.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious).toEqual([]);
  expect(errors).toEqual([]);
});
