import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { JSDOM, VirtualConsole } from 'jsdom';
import { createApp } from '../server.mjs';
import { passwordHash } from '../auth.mjs';

async function waitFor(condition) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail('A interface não concluiu a operação no tempo esperado.');
}

test('menu separa seções, preserva edições e salva somente a seção ativa', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'lm-admin-navigation-'));
  let app, dom;
  try {
    const password = 'Senha-teste-navegacao-47!';
    await writeFile(
      join(dataDir, 'admin.json'),
      JSON.stringify({ email: 'interface@example.com', ...(await passwordHash(password)) })
    );
    app = createApp({ dataDir });
    app.listen(0, '127.0.0.1');
    await once(app, 'listening');
    const origin = 'http://127.0.0.1:' + app.address().port;
    const login = await fetch(origin + '/api/auth/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'interface@example.com', password }),
    });
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie').split(';')[0];
    const html = await (await fetch(origin + '/admin/')).text();
    const script = await readFile(new URL('../admin/admin.js', import.meta.url), 'utf8');
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => errors.push(error.message));
    dom = new JSDOM(html, {
      url: origin + '/admin/#biography',
      runScripts: 'outside-only',
      virtualConsole,
    });
    const { window } = dom,
      document = window.document;
    window.structuredClone = structuredClone;
    window.fetch = (path, options = {}) =>
      fetch(new URL(path, origin), {
        ...options,
        headers: { Origin: origin, Cookie: cookie, ...options.headers },
      });
    window.eval(script);
    await waitFor(
      () =>
        document.querySelector('[data-content-page="biography"]') &&
        document.querySelector('#list-status').textContent
    );
    assert.equal(document.querySelector('#workspace').hidden, false);
    assert.ok(document.querySelector('#events-workspace').closest('.admin-main'));
    assert.ok(document.querySelector('#site-content').closest('.admin-main'));
    const $ = (selector) => document.querySelector(selector);
    async function navigate(name) {
      $('[data-section="' + name + '"]').click();
      await waitFor(
        () => $('[data-section="' + name + '"]').getAttribute('aria-current') === 'page'
      );
      assert.equal(
        [...document.querySelectorAll('[data-admin-page]')].filter((page) => !page.hidden).length,
        1
      );
      const content = !['events', 'categories'].includes(name);
      assert.equal($('#site-content').hidden, !content);
      if (content) {
        assert.equal(
          [...document.querySelectorAll('[data-content-page]')].filter((page) => !page.hidden)
            .length,
          1
        );
        assert.equal($('[data-content-page="' + name + '"]').disabled, false);
      }
    }
    for (const section of [
      'events',
      'categories',
      'hero',
      'biography',
      'portfolio',
      'shop',
      'testimonials',
      'brand',
    ])
      await navigate(section);
    assert.equal(document.querySelectorAll('.testimonial-editor').length, 6);
    await navigate('biography');
    const name = $('[data-text="bioName"]');
    name.value = 'Lucas Martins atualizado';
    name.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.ok($('[data-section="biography"]').classList.contains('has-changes'));
    await navigate('hero');
    const heroTitle = $('[data-text="heroTitle"]');
    const previousTitle = heroTitle.value;
    heroTitle.value = '';
    heroTitle.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal($('#content-editor').checkValidity(), false);
    await navigate('biography');
    assert.equal(name.value, 'Lucas Martins atualizado');
    assert.equal(
      $('#content-editor').checkValidity(),
      true,
      'campo inválido de outra seção não deve bloquear o salvamento'
    );
    $('#content-editor').requestSubmit($('#content-save'));
    await waitFor(
      () =>
        $('[data-section="biography"]').classList.contains('has-changes') === false &&
        !$('#content-save').disabled
    );
    let content = (await (await fetch(origin + '/api/content')).json()).content;
    assert.equal(content.bioName, 'Lucas Martins atualizado');
    assert.equal(content.heroTitle, previousTitle);
    await navigate('hero');
    assert.equal(heroTitle.value, '', 'edição pendente deve continuar no formulário');
    heroTitle.value = 'Um novo momento';
    heroTitle.dispatchEvent(new window.Event('input', { bubbles: true }));
    $('#content-editor').requestSubmit($('#content-save'));
    await waitFor(
      () =>
        $('[data-section="hero"]').classList.contains('has-changes') === false &&
        !$('#content-save').disabled
    );
    content = (await (await fetch(origin + '/api/content')).json()).content;
    assert.equal(content.heroTitle, 'Um novo momento');
    assert.equal(content.bioName, 'Lucas Martins atualizado');
    await navigate('testimonials');
    const details = document.querySelectorAll('.testimonial-editor')[1];
    details.open = false;
    const quote = $('[data-text="testimonialQuote2"]');
    quote.value = '';
    quote.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal($('#content-editor').checkValidity(), false);
    assert.equal(details.open, true);
    await navigate('events');
    assert.equal($('#events-workspace').hidden, false);
    assert.deepEqual(errors, []);
  } finally {
    dom?.window.close();
    if (app) {
      app.closeAllConnections();
      await new Promise((resolve) => app.close(resolve));
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});
