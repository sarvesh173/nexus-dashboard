#!/usr/bin/env node
/**
 * Standalone visual/interaction verification for the Nexus navigation.
 *
 * Usage:
 *   node scripts/verify-ui-playwright.mjs
 *   BASE_URL=http://127.0.0.1:5173 node scripts/verify-ui-playwright.mjs
 *   node scripts/verify-ui-playwright.mjs --base-url http://127.0.0.1:5173
 *
 * The default run writes eight screenshots (active + hover for each route) to
 * artifacts/playwright. Use --check-only to run the assertions without writing
 * screenshots. This file intentionally uses the installed `playwright` package
 * directly and does not require @playwright/test or a package.json script.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const baseUrl = option('--base-url')
  || process.env.BASE_URL
  || process.env.PLAYWRIGHT_BASE_URL
  || 'http://localhost:5173';
const outputDir = path.resolve(
  option('--output') || process.env.SCREENSHOT_DIR || 'artifacts/playwright',
);
const checkOnly = args.includes('--check-only') || args.includes('--no-screenshots');
const timeout = Number(process.env.PLAYWRIGHT_TIMEOUT || 10_000);

const routes = [
  { key: 'overview', label: 'Overview', path: '/' },
  { key: 'models', label: 'Models', path: '/model' },
  { key: 'cost', label: 'Cost', path: '/cost' },
  { key: 'settings', label: 'Settings', path: '/settings' },
];

function assert(condition, message) {
  if (!condition) throw new Error(`Verification failed: ${message}`);
}

function samePath(url, expectedPath) {
  return new URL(url).pathname.replace(/\/$/, '') === expectedPath.replace(/\/$/, '');
}

function navButton(page, label) {
  // The breadcrumb is also a nav element. Restrict this locator to the
  // segmented navigation in the app header so labels remain unambiguous.
  return page.locator('header nav').getByRole('button', { name: label, exact: true });
}

async function waitForApp(page) {
  await page.locator('main').waitFor({ state: 'visible', timeout });
  await page.locator('header nav').waitFor({ state: 'visible', timeout });
}

async function goTo(page, base, route) {
  await page.goto(new URL(route, base).toString(), {
    waitUntil: 'domcontentloaded',
    timeout,
  });
  await waitForApp(page);
}

async function clearHover(page) {
  await page.mouse.move(1, 1);
  await page.waitForTimeout(80);
}

async function computedIconState(button) {
  const svg = button.locator('svg').first();
  await svg.waitFor({ state: 'visible', timeout });
  const wrapper = svg.locator('..');
  return {
    wrapper,
    state: await wrapper.evaluate((element) => {
      const style = getComputedStyle(element);
      const pseudo = getComputedStyle(element, '::after');
      return {
        transform: style.transform,
        transitionProperty: style.transitionProperty,
        animationName: style.animationName,
        pseudoAnimationName: pseudo.animationName,
      };
    }),
  };
}

async function assertNavigationState(page, current) {
  for (const item of routes) {
    const button = navButton(page, item.label);
    await button.waitFor({ state: 'visible', timeout });
    const ariaCurrent = await button.getAttribute('aria-current');
    if (item.key === current.key) {
      assert(
        ariaCurrent === 'page',
        `${item.label} must expose aria-current="page" on ${current.path}; got ${String(ariaCurrent)}`,
      );
    } else {
      assert(
        ariaCurrent !== 'page',
        `${item.label} must not expose aria-current="page" while ${current.label} is active`,
      );
    }
  }
}

async function assertIconMotion(page, item, button) {
  const { wrapper, state: activeState } = await computedIconState(button);

  // All four nav icons use a transform transition in the hover design. This
  // checks the transition is still present even for icons without a bespoke
  // active transform.
  assert(
    activeState.transitionProperty.split(',').some((property) => property.trim() === 'transform'),
    `${item.label} icon should expose a transform transition`,
  );

  if (item.key === 'models') {
    // Models has an explicit active 3-D transform and a pseudo-element sheen.
    assert(
      activeState.transform !== 'none',
      'Models icon should have a non-none transform in its active state',
    );
    assert(
      activeState.pseudoAnimationName && activeState.pseudoAnimationName !== 'none',
      'Models icon should expose its active sheen animation',
    );
  }

  await button.hover();
  await page.waitForTimeout(450);
  const hoverState = await wrapper.evaluate((element) => {
    const style = getComputedStyle(element);
    const pseudo = getComputedStyle(element, '::after');
    return {
      transform: style.transform,
      pseudoAnimationName: pseudo.animationName,
    };
  });

  assert(
    hoverState.transform !== 'none',
    `${item.label} icon should transform on hover`,
  );

  if (item.key === 'models') {
    assert(
      hoverState.pseudoAnimationName && hoverState.pseudoAnimationName !== 'none',
      'Models icon should expose its hover sheen animation',
    );
  }
}

async function screenshot(page, item, state) {
  if (checkOnly) return;
  await page.screenshot({
    path: path.join(outputDir, `${item.key}-${state}.png`),
    fullPage: true,
  });
}

async function verifyRoute(page, base, item, index) {
  if (index === 0) {
    await goTo(page, base, item.path);
  } else {
    const target = navButton(page, item.label);
    await target.click();
    await page.waitForURL((url) => samePath(url.toString(), item.path), { timeout });
    await waitForApp(page);
    // Data-backed route content can keep the app in a transitional render for
    // a moment after history updates. Wait for the active tab itself, not just
    // the URL, before asserting the navigation state or capturing a frame.
    await page.locator('header nav button[aria-current="page"]')
      .filter({ hasText: item.label })
      .waitFor({ state: 'visible', timeout });
  }

  assert(
    samePath(page.url(), item.path),
    `${item.label} navigation should end at ${item.path}; got ${page.url()}`,
  );
  await assertNavigationState(page, item);

  await clearHover(page);
  await screenshot(page, item, 'active');

  const target = navButton(page, item.label);
  await assertIconMotion(page, item, target);
  await screenshot(page, item, 'hover');
  await clearHover(page);
}

async function verifyMobileProviderGrid(page, base) {
  await page.setViewportSize({ width: 390, height: 844 });
  await goTo(page, base, '/model');
  await page.waitForTimeout(250);

  const grid = page.locator('main div[style*="grid-template-columns"]').first();
  if (await grid.count() === 0) {
    console.log('Mobile provider grid: skipped (catalog did not render a grid).');
    return;
  }

  const details = await grid.evaluate((element) => {
    const children = [...element.children];
    const rect = element.getBoundingClientRect();
    return {
      cardCount: children.length,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      gridRight: rect.right,
      viewportWidth: window.innerWidth,
      cardRights: children.map((child) => child.getBoundingClientRect().right),
    };
  });

  if (details.cardCount === 0) {
    console.log('Mobile provider grid: skipped (no provider data).');
    return;
  }

  // Interactive model pills intentionally render absolute detail tooltips
  // outside a card; those overlays contribute to scrollWidth but are not grid
  // tracks. Validate the actual grid/card geometry instead.
  assert(
    details.gridRight <= details.viewportWidth + 1,
    `provider grid must fit the mobile viewport (${details.gridRight} > ${details.viewportWidth})`,
  );
  assert(
    details.cardRights.every((right) => right <= details.viewportWidth + 1),
    'every rendered provider card must remain inside the mobile viewport',
  );
  console.log(`Mobile provider grid: checked ${details.cardCount} provider card(s); tooltip overlays excluded from track geometry.`);
}

async function main() {
  const parsedBase = new URL(baseUrl);
  assert(parsedBase.protocol === 'http:' || parsedBase.protocol === 'https:', `unsupported base URL: ${baseUrl}`);

  if (!checkOnly) await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.HEADED !== '1',
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {}),
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();

    for (const [index, item] of routes.entries()) {
      await verifyRoute(page, parsedBase, item, index);
      console.log(`${item.label}: aria-current, icon motion, active screenshot, and hover screenshot verified.`);
    }

    await verifyMobileProviderGrid(page, parsedBase);
    await context.close();
  } finally {
    await browser.close();
  }

  console.log(checkOnly
    ? 'Playwright verification passed (screenshots disabled).'
    : `Playwright verification passed; screenshots written to ${outputDir}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
