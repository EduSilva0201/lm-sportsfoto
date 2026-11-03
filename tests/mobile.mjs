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
  const initial = (await api('/api/content')).content;
  await api('/api/admin/content', 'PUT', { ...initial, contactWhatsApp: '5511000000000' });
  const ids = [];
  for (let i = 0; i < 3; i++)
    ids.push(
      (
        await api('/api/admin/events', 'POST', {
          name: ['Corrida no Parque', 'Futebol de domingo', 'Treino em Brasília'][i],
          place: i === 1 ? 'Goiânia · GO' : 'Brasília · DF',
          type: i === 1 ? 'Futebol' : 'Corrida',
          platform: 'Banlek',
          date: ['2026-10-25', '2026-10-26', '2026-10-27'][i],
          url: 'https://example.com/album',
          image: ['0392', '2024', '9433'][i],
          status: 'published',
          description: 'Evento demonstrativo para teste de navegação.',
        })
      ).event.id
    );
  browser = await chromium.launch({
    channel: process.env.LM_BROWSER_CHANNEL || 'msedge',
    headless: true,
  });
  const artifacts = resolve('artifacts/mobile');
  await mkdir(artifacts, { recursive: true });
  const profiles = [
    { name: 'mobile-360', width: 360, height: 800, mobile: true },
    { name: 'iphone-390', width: 390, height: 844, mobile: true },
    { name: 'android-412', width: 412, height: 915, mobile: true },
    { name: 'tablet-768', width: 768, height: 1024, mobile: true },
    { name: 'desktop-1366', width: 1366, height: 900, mobile: false },
  ];
  for (const profile of profiles) {
    const context = await browser.newContext({
      ...(profile.mobile ? devices['iPhone 13'] : {}),
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: 1,
      isMobile: profile.mobile,
      hasTouch: profile.mobile,
      reducedMotion: 'reduce',
    });
    await context.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin);
    await expect(page.locator('#event-grid .album-card')).toHaveCount(3);
    await expect(page.locator('#contact-whatsapp')).toBeVisible();
    const overflow = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll('body *')]
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.right > innerWidth + 2 && !el.closest('dialog:not([open])');
        })
        .slice(0, 8)
        .map((el) => el.tagName + '.' + el.className),
    }));
    expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(profile.width + 1);
    if (profile.width < 650) {
      await page.locator('.menu').tap();
      await expect(page.locator('header nav')).toHaveClass(/open/);
      await page.locator('header nav a[href="#duvidas"]').tap();
      await expect(page.locator('.menu')).toHaveAttribute('aria-expanded', 'false');
    }
    await page.locator('.extra-filters summary').click();
    await page.locator('#city-filter').selectOption('Goiânia · GO');
    await expect(page.locator('#event-grid .album-card')).toHaveCount(1);
    await page.locator('#city-filter').selectOption('');
    await page.locator('#date-from').fill('2026-10-27');
    await expect(page.locator('#event-grid .album-card')).toHaveCount(1);
    await page.locator('#date-from').fill('');
    await page.locator('.faq-item summary').first().click();
    await expect(page.locator('.faq-item').first()).toHaveAttribute('open', '');
    const manifestoBounds = await page.evaluate(() => {
      const photo = document.querySelector('.manifesto-photo').getBoundingClientRect(),
        image = document.querySelector('.manifesto-photo img').getBoundingClientRect();
      return {
        topDifference: Math.abs(photo.top - image.top),
        bottomDifference: Math.abs(photo.bottom - image.bottom),
      };
    });
    expect(manifestoBounds.topDifference).toBeLessThanOrEqual(1);
    expect(manifestoBounds.bottomDifference).toBeLessThanOrEqual(1);
    await page.locator('.portfolio-grid .photo-open').first().click();
    await expect(page.locator('#photo-viewer')).toBeVisible();
    const before = await page.locator('#photo-full').getAttribute('src');
    await page.locator('#photo-next').click();
    expect(await page.locator('#photo-full').getAttribute('src')).not.toBe(before);
    await page
      .locator('#photo-viewer')
      .screenshot({ path: join(artifacts, profile.name + '-galeria.png') });
    await page.locator('#photo-close').click();
    await expect(page.locator('#photo-viewer')).not.toBeVisible();
    await page.locator('#quote [name=name]').fill('Teste de celular');
    await page.locator('#quote [name=email]').fill('teste@example.com');
    await page.locator('#quote [name=message]').fill('Gostaria de uma cobertura de corrida.');
    await page.locator('#quote button[type=submit]').click();
    await expect(page.locator('#quote-send')).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/5511000000000\?text=/
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page
      .locator('.hero-gallery')
      .screenshot({ path: join(artifacts, profile.name + '-hero.png') });
    await page
      .locator('.manifesto')
      .screenshot({ path: join(artifacts, profile.name + '-portfolio-destaque.png') });
    for (
      let y = 0;
      y < (await page.evaluate(() => document.documentElement.scrollHeight));
      y += profile.height
    ) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.waitForTimeout(30);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: join(artifacts, profile.name + '-site.png'), fullPage: true });
    await page.locator('.event-detail-link').first().click();
    await expect(page.locator('.event-detail h1')).toBeVisible();
    await expect(page.locator('#share-whatsapp')).toHaveAttribute(
      'href',
      /^https:\/\/wa\.me\/\?text=/
    );
    await page.locator('#copy-event').click();
    await page.screenshot({ path: join(artifacts, profile.name + '-evento.png'), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      profile.width + 1
    );
    await page.goto(origin + '/admin/#hero');
    await page.locator('#login [name=email]').fill('mobile@example.com');
    await page.locator('#login [name=password]').fill(password);
    await page.locator('#login button').click();
    await expect(page.locator('[data-content-page=hero]')).toBeVisible();
    for (const section of [
      'events',
      'categories',
      'biography',
      'portfolio',
      'shop',
      'testimonials',
      'brand',
      'contact',
      'faq',
      'seo',
      'hero',
    ]) {
      await page.locator('[data-section=' + section + ']').click();
      await expect(page.locator('[data-section=' + section + ']')).toHaveAttribute(
        'aria-current',
        'page'
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        'Overflow no painel ' + section
      ).toBeLessThanOrEqual(profile.width + 1);
    }
    const title = page.locator('[data-text=heroTitle]');
    await title.fill('Prévia no celular');
    await page.locator('#content-preview').click();
    await expect(page.locator('#preview-dialog')).toBeVisible();
    await expect(page.frameLocator('#preview-frame').locator('#hero-title')).toHaveText(
      'Prévia no celular'
    );
    expect((await api('/api/content')).content.heroTitle).toBe(initial.heroTitle);
    await page.locator('#preview-close').click();
    await page.screenshot({ path: join(artifacts, profile.name + '-painel.png'), fullPage: true });
    expect(errors).toEqual([]);
    report.viewports.push({ ...profile, status: 'passed' });
    await context.close();
    console.log('OK: ' + profile.name);
  }
  const motion = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
  });
  await motion.route('**/*', (route) =>
    new URL(route.request().url()).origin === origin ? route.continue() : route.abort()
  );
  const motionPage = await motion.newPage();
  await motionPage.goto(origin);
  await expect(motionPage.locator('#hero-slide-2')).toHaveClass(/is-active/, { timeout: 10000 });
  await motionPage.locator('#hero-pause').click();
  const active = await motionPage.locator('.hero-slide.is-active').getAttribute('id');
  await motionPage.waitForTimeout(6500);
  expect(await motionPage.locator('.hero-slide.is-active').getAttribute('id')).toBe(active);
  expect(await motionPage.locator('#hero-prev,#hero-next').count()).toBe(0);
  await motion.close();
  report.checks = [
    'Hero automática e pausa sem avanço manual',
    'Alinhamento da imagem de destaque',
    'Menu móvel',
    'Filtros por local e data',
    'FAQ expansível',
    'Galeria e navegação',
    'Orçamento por WhatsApp (sem envio)',
    'Página e compartilhamento de evento',
    'Menu administrativo completo',
    'Prévia sem gravação',
    'Sem rolagem horizontal',
    'Sem erros JavaScript',
  ];
  await writeFile(join(artifacts, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log('Relatório e capturas em artifacts/mobile. Dados de .local preservados.');
} finally {
  await browser?.close();
  if (app) {
    app.closeAllConnections();
    await new Promise((resolve) => app.close(resolve));
  }
  await rm(dataDir, { recursive: true, force: true });
}
