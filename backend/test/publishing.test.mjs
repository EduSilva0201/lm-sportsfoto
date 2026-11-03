import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { renderHome, renderEvent } from '../publishing.mjs';
test('modo de preparação e depoimentos ocultos são respeitados antes do JavaScript', async () => {
  const template = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
  const preview = new JSDOM(
    renderHome(
      template,
      {
        siteStage: 'preview',
        testimonialsMode: 'hidden',
        seoTitle: 'Título <seguro>',
        seoDescription: 'Descrição do site',
      },
      'https://lm.example'
    )
  );
  assert.equal(preview.window.document.querySelector('#depoimentos').hidden, true);
  assert.equal(
    preview.window.document.querySelector('meta[name=robots]').content,
    'noindex, nofollow'
  );
  assert.equal(preview.window.document.title, 'Título <seguro>');
  preview.window.close();
  const live = new JSDOM(
    renderHome(template, { siteStage: 'live', testimonialsMode: 'demo' }, 'https://lm.example')
  );
  assert.equal(live.window.document.querySelector('.devbar').hidden, true);
  assert.equal(live.window.document.querySelector('meta[name=robots]'), null);
  assert.equal(
    live.window.document.querySelector('footer small').textContent,
    'LM SportsFoto · Lucas Martins'
  );
  live.window.close();
  const eventTemplate = await readFile(new URL('../../dist/event.html', import.meta.url), 'utf8');
  const event = {
    id: 'event',
    name: 'Corrida',
    type: 'Corrida',
    date: '2026-10-31',
    place: 'Brasília',
    image: '0392',
    platform: 'Banlek',
    url: 'https://example.com/album',
  };
  assert.ok(
    renderEvent(eventTemplate, event, 'https://lm.example', { siteStage: 'preview' }).includes(
      'noindex'
    )
  );
  assert.ok(
    !renderEvent(eventTemplate, event, 'https://lm.example', { siteStage: 'live' }).includes(
      'noindex'
    )
  );
});

test('conteúdo publicado controla modo do site e disponibilidade do WhatsApp no navegador', async () => {
  const template = await readFile(new URL('../../dist/index.html', import.meta.url), 'utf8');
  const fields = JSON.parse(
    await readFile(new URL('../content-fields.json', import.meta.url), 'utf8')
  );
  const content = {
    ...Object.fromEntries(fields.map((field) => [field.key, field.value])),
    siteStage: 'live',
    testimonialsMode: 'hidden',
    contactWhatsApp: '5511000000000',
  };
  const dom = new JSDOM(template, { url: 'https://lm.example/', runScripts: 'outside-only' });
  try {
    dom.window.fetch = async () => Response.json({ fields, content });
    const loaded = new Promise((resolve) =>
      dom.window.addEventListener('lm:content', resolve, { once: true })
    );
    dom.window.eval(await readFile(new URL('../../dist/content.js', import.meta.url), 'utf8'));
    await loaded;
    assert.equal(dom.window.document.querySelector('.devbar').hidden, true);
    assert.equal(dom.window.document.querySelector('#depoimentos').hidden, true);
    assert.equal(
      dom.window.document.querySelector('#contact-whatsapp').href,
      'https://wa.me/5511000000000'
    );
    assert.equal(
      dom.window.document.querySelector('footer small').textContent,
      'LM SportsFoto · Lucas Martins'
    );
  } finally {
    dom.window.close();
  }
});
