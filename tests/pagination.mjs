import { chromium, devices, expect } from '@playwright/test';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../backend/server.mjs';
import { passwordHash } from '../backend/auth.mjs';
const dataDir = await mkdtemp(join(tmpdir(), 'lm-mobile-'));
let app, browser;
const report = {
  testedAt: new Date().toISOString(),
  engine: 'Chromium / Microsoft Edge',
  viewports: [],
  checks: [],
};
try {
  const password = 'Senha-mobile-teste-47!';
  await writeFile(
    join(dataDir, 'admin.json'),
    JSON.stringify({ email: 'mobile@example.com', ...(await passwordHash(password)) })
  );
  app = createApp({ dataDir });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const origin = 'http://127.0.0.1:' + app.address().port;
  const login = await fetch(origin + '/api/auth/login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'mobile@example.com', password }),
  });
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const api = async (path, method = 'GET', body) => {
    const response = await fetch(origin + path, {
      method,
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw Error(JSON.stringify(data));
    return data;
  };

  for (let i = 1; i <= 13; i++)
    await api('/api/admin/events', 'POST', {
      name: 'Evento ' + String(i).padStart(2, '0'),
      place: i === 13 ? 'Brasília' : 'Goiânia',
      type: 'Corrida',
      platform: 'Banlek',
      date: '2026-10-27',
      url: 'https://example.com/album',
      image: '0392',
      status: 'published',
      description: '',
    });
  browser = await chromium.launch({
    channel: process.env.LM_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
  for (const width of [360, 1366]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const [cookieName, cookieValue] = cookie.split('=');
    await context.addCookies([{ name: cookieName, value: cookieValue, url: origin }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin);
    await expect(page.locator('#event-grid .album-card')).toHaveCount(6);
    await expect(page.locator('#event-page')).toHaveText('Página 1 de 3');
    await page.locator('#event-next').click();
    await expect(page.locator('#event-page')).toHaveText('Página 2 de 3');
    await page.locator('#event-next').click();
    await expect(page.locator('#event-grid .album-card')).toHaveCount(1);
    await expect(page.locator('#event-next')).toBeDisabled();
    await page.locator('#event-prev').click();
    await expect(page.locator('#event-grid .album-card')).toHaveCount(6);
    await page.locator('#search').fill('brasilia');
    await expect(page.locator('#event-grid .album-card')).toHaveCount(1);
    await expect(page.locator('#event-pagination')).toBeHidden();
    await page.locator('#search').fill('inexistente');
    await expect(page.locator('#empty')).toBeVisible();
    await page.locator('#search').fill('');
    await expect(page.locator('#event-page')).toHaveText('Página 1 de 3');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await page.goto(origin + '/admin/');
    await expect(page.locator('#event-list article')).toHaveCount(6);
    await expect(page.locator('#admin-event-page')).toHaveText('Página 1 de 3');
    await page.locator('#admin-event-next').click();
    await page.locator('#admin-event-next').click();
    await expect(page.locator('#event-list article')).toHaveCount(1);
    await expect(page.locator('#admin-event-next')).toBeDisabled();
    // Removing the last record must clamp the now-empty last page.
    if (width === 1366) {
      await page.locator('#event-list [data-delete]').click();
      await page.locator('#confirm-delete').click();
      await expect(page.locator('#admin-event-page')).toHaveText('Página 2 de 2');
      await expect(page.locator('#event-list article')).toHaveCount(6);
    }
    await page.locator('#admin-event-search').fill('goiania');
    await expect(page.locator('#admin-event-page')).toHaveText('Página 1 de 2');
    await page.locator('#admin-event-search').fill('Evento 02');
    await expect(page.locator('#event-list article')).toHaveCount(1);
    await expect(page.locator('#admin-event-pagination')).toBeHidden();
    await page.locator('#admin-event-search').fill('inexistente');
    await expect(page.locator('#event-list article')).toHaveCount(0);
    await expect(page.locator('#list-status')).toContainText('Nenhum evento encontrado');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    expect(errors).toEqual([]);
    console.log('Pesquisa e paginação verificadas em ' + width + 'px');
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise((resolve) => (app ? app.close(resolve) : resolve()));
  await rm(dataDir, { recursive: true, force: true });
}
