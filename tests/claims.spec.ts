import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const winningRoute = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  for (const key of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowRight', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowUp']) {
    await page.keyboard.press(key);
  }
  await expect(page.getByRole('heading', { name: 'You reached the exit' })).toBeVisible();
};

const finishRoute = async (page: Page, keys: string[]): Promise<void> => {
  await page.getByRole('button', { name: 'Start run' }).click();
  for (const key of keys) await page.keyboard.press(key);
  await expect(page.getByRole('heading', { name: 'You reached the exit' })).toBeVisible();
};

const readCard = async (page: Page): Promise<{ speed: number; elegance: number; rescues: number }> => {
  const values = await page.getByLabel('This run').locator('strong').allTextContents();
  return {
    speed: Number.parseInt(values[0], 10),
    elegance: Number.parseInt(values[1], 10),
    rescues: Number.parseInt(values[2], 10)
  };
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
  await page.getByRole('button', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByLabel('Sample best')).toBeVisible();
  await expect(page.getByTestId('shared-route-status')).toContainText('loaded');
  await expect(page.getByRole('img', { name: /Board Practice 01/ })).toHaveAttribute('data-ghost-step', '1');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('Demo reset. Your real game was not changed.')).toBeVisible();
  await expect(page.getByTestId('shared-route-status')).toContainText('loaded');
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
  await page.waitForLoadState('networkidle');
  const right = page.getByRole('button', { name: 'Move right' });
  await right.scrollIntoViewIfNeeded();
  await expect(right).toBeVisible();
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

test('@claim:server-verified-replay gives a share code only after the server accepts a completed route', async ({ page }) => {
  await page.goto('/demo');
  await winningRoute(page);
  const code = await page.getByLabel('Completed replay code').inputValue();
  expect(code).toMatch(/^RR2-[A-Z0-9-]+$/);
  const rejected = await page.request.post('/api/replays', {
    data: { board_id: 'practice-01', moves: 'R' }
  });
  expect(rejected.status()).toBe(422);
  expect((await rejected.json()).code).toBeUndefined();
});

test('@claim:daily-and-archive provides one daily and twenty permanent boards', async ({ page }) => {
  await page.goto('/demo');
  await expect(page.getByRole('group', { name: 'Twenty permanent practice boards' }).getByRole('button')).toHaveCount(20);
  await page.getByRole('button', { name: 'Play today’s board' }).click();
  await expect(page.getByRole('heading', { name: /Daily board/ })).toBeVisible();
  await page.getByRole('button', { name: '01' }).click();
  await expect(page.getByRole('heading', { name: 'Practice 01' })).toBeVisible();
});

test('@claim:daily-board-changes gives a different daily board on a new UTC day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-05T12:00:00.000Z') });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Daily board · 2026-09-05' })).toBeVisible();
  const firstSeed = await page.locator('.game-stage .eyebrow').textContent();
  await page.clock.setFixedTime(new Date('2026-09-06T12:00:00.000Z'));
  await page.goto('/?new-day=1');
  await expect(page.getByRole('heading', { name: 'Daily board · 2026-09-06' })).toBeVisible();
  const secondSeed = await page.locator('.game-stage .eyebrow').textContent();
  expect(secondSeed).not.toBe(firstSeed);
});

test('@claim:rally-card-values gives elegance for fewer moves and a rescue count for a detour', async ({ page }) => {
  await page.goto('/demo');
  await winningRoute(page);
  const direct = await readCard(page);
  await page.getByRole('button', { name: 'Play this board again' }).click();
  await finishRoute(page, ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowUp', 'ArrowUp']);
  const rescueDetour = await readCard(page);
  expect(direct.elegance).toBeGreaterThan(rescueDetour.elegance);
  expect(direct.rescues).toBe(0);
  expect(rescueDetour.rescues).toBe(1);
});

test('@claim:replay-code-private shares an opaque route code with no name or profile', async ({ page, browser }) => {
  await page.goto('/demo');
  await winningRoute(page);
  const code = await page.getByLabel('Completed replay code').inputValue();
  expect(code).toMatch(/^RR2-[A-Z0-9-]+$/);
  const friendContext = await browser.newContext();
  const friend = await friendContext.newPage();
  await friend.goto('/demo');
  await friend.getByLabel('Replay code').fill(code);
  await friend.getByRole('button', { name: 'Load replay code' }).click();
  await expect(friend.getByText('No account is shown.')).toBeVisible();
  await friendContext.close();
});

test('@claim:completed-replay-only rejects an incomplete route before it can become a replay code', async ({ page }) => {
  await page.goto('/demo');
  const invalid = await page.request.post('/api/replays', {
    data: { board_id: 'practice-01', moves: 'R' }
  });
  expect(invalid.status()).toBe(422);
  await page.getByLabel('Replay code').fill('RR2-NOT-A-REAL-REPLAY');
  await page.getByRole('button', { name: 'Load replay code' }).click();
  await expect(page.getByText('This replay code is not valid. Paste a server-checked code that starts with RR2.')).toBeVisible();
  await expect(page.getByTestId('shared-route-status')).toContainText('loaded');
});

test('@claim:route-sound-after-move starts route sound only after a valid first move', async ({ page }) => {
  await page.addInitScript(() => {
    const routeTone = { starts: 0 };
    Object.defineProperty(window, '__routeTone', { value: routeTone, configurable: true });
    class AudioContextStub {
      currentTime = 0;
      destination = {};
      createGain() {
        return {
          gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
          connect() { return {}; }
        };
      }
      createOscillator() {
        return {
          type: 'triangle',
          frequency: { value: 0 },
          connect: (gain: unknown) => gain,
          start() { routeTone.starts += 1; },
          stop() {}
        };
      }
    }
    Object.defineProperty(window, 'AudioContext', { value: AudioContextStub, configurable: true });
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __routeTone: { starts: number } }).__routeTone.starts)).toBe(0);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __routeTone: { starts: number } }).__routeTone.starts)).toBe(1);
});

test('@claim:reduce-replay-motion completes a shared route without route animation', async ({ page }) => {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('checkbox', { name: /Reduce movement/ }).check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByRole('button', { name: 'Play shared route' }).click();
  await page.waitForTimeout(80);
  const board = page.getByRole('img', { name: /Board Practice 01/ });
  const step = Number(await board.getAttribute('data-ghost-step'));
  const length = Number(await board.getAttribute('data-ghost-length'));
  expect(step).toBe(length);
});

test('@claim:no-tracking makes no third-party requests during a sample run', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.goto('/demo');
  const productOrigin = new URL(page.url()).origin;
  await page.getByRole('button', { name: 'Start the sample board' }).click();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === productOrigin)).toBeTruthy();
});

test('plays a complete win, restarts, and reaches the supported loss screen', async ({ page }) => {
  await page.goto('/demo');
  await winningRoute(page);
  await expect(page.getByLabel('Completed replay code')).toHaveValue(/^RR2-/);
  await page.getByRole('button', { name: 'Play this board again' }).click();
  await expect(page.getByTestId('timer')).toHaveText('1:30');
  await page.getByRole('button', { name: 'Start run' }).click();
  await page.getByRole('button', { name: 'Pause run' }).click();
  await page.getByRole('button', { name: 'End this run' }).click();
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The route was not completed' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restart this board' })).toBeVisible();
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
  await expect(page.getByText('This replay code is not valid. Paste a server-checked code that starts with RR2.')).toBeVisible();
  await page.keyboard.press('p');
  await expect(page.getByRole('heading', { name: 'Run paused' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume run' })).toBeVisible();
  await page.goto('/privacy');
  await expect(page).toHaveTitle('Privacy — Rankless Rally');
  await expect(page.getByRole('heading', { name: 'Keep puzzle progress in your browser' })).toBeVisible();
  await page.goto('/terms');
  await expect(page).toHaveTitle('Terms — Rankless Rally');
  const response = await page.goto('/not-a-route');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Choose a board that exists' })).toBeVisible();
  await page.goto('/demo');
  const report = await new AxeBuilder({ page: page as never }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = report.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(serious).toEqual([]);
  expect(errors.filter((message) => !message.includes('server responded with a status of 404'))).toEqual([]);
});

test('opens Archive, restores keyboard focus, uses valid ARIA, and keeps all phone links touch sized', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Archive' }).click();
  await expect(page).toHaveURL(/\?archive=1$/);
  const archiveTitle = page.getByRole('heading', { name: 'Choose a practice board' });
  await page.waitForTimeout(1000);
  await expect(archiveTitle).toBeInViewport();
  const settledArchive = await archiveTitle.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, viewport: window.innerHeight };
  });
  expect(settledArchive.top).toBeGreaterThanOrEqual(0);
  expect(settledArchive.bottom).toBeLessThanOrEqual(settledArchive.viewport);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('archive-title');

  await page.getByLabel('Main navigation').getByRole('link', { name: 'Privacy' }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1');

  await page.route('**/api/replays/demo', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750));
    await route.continue();
  });
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.action)).toBe('settings');
  await page.waitForLoadState('networkidle');
  await expect.poll(() => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.action)).toBe('settings');

  const targetBoxes = await page.locator('.site-header .wordmark, .site-header nav a, .privacy-section > a, .site-footer a').evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, height: box.height };
  }));
  expect(targetBoxes.length).toBeGreaterThan(0);
  for (const box of targetBoxes) expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);

  const report = await new AxeBuilder({ page: page as never }).analyze();
  const seriousOrCritical = report.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact ?? ''));
  expect(seriousOrCritical).toEqual([]);
  expect(report.violations.find((violation) => violation.id === 'aria-allowed-role')).toBeUndefined();
});

test('uses route-specific canonicals for every public page', async ({ page }) => {
  for (const [path, canonical] of [
    ['/', 'https://rankless-rally.sociobot.in/'],
    ['/demo', 'https://rankless-rally.sociobot.in/demo'],
    ['/privacy', 'https://rankless-rally.sociobot.in/privacy'],
    ['/terms', 'https://rankless-rally.sociobot.in/terms']
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
  }
});

test('has no full Axe violations in the dark treatment', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/demo');
  const report = await new AxeBuilder({ page: page as never }).analyze();
  expect(report.violations).toEqual([]);
});
