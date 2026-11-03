import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server.mjs';
import { passwordHash } from '../auth.mjs';

test('login, catálogo persistente, rascunhos, validação, uploads e permissões', async (t) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'lm-test-'));
  const password = 'Senha-local-teste-47!';
  await writeFile(
    join(dataDir, 'admin.json'),
    JSON.stringify({ email: 'teste@example.com', ...(await passwordHash(password)) })
  );
  let app,
    origin,
    cookie = '';
  const start = async () => {
    app = createApp({ dataDir });
    app.listen(0, '127.0.0.1');
    await once(app, 'listening');
    origin = `http://127.0.0.1:${app.address().port}`;
  };
  const stop = async () => {
    app.closeAllConnections();
    await new Promise((resolve) => app.close(resolve));
  };
  const request = async (path, method = 'GET', data, headers = {}) => {
    const response = await fetch(origin + path, {
      method,
      headers: {
        Origin: origin,
        Cookie: cookie,
        ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
    return { status: response.status, data: await response.json(), headers: response.headers };
  };
  await start();
  try {
    assert.equal((await request('/api/admin/content')).status, 401);
    assert.equal((await request('/api/admin/content', 'PUT', {})).status, 401);
    assert.equal((await request('/api/admin/categories')).status, 401);
    assert.equal(
      (await request('/api/admin/categories', 'POST', { kind: 'album', name: 'Ciclismo' })).status,
      401
    );
    assert.equal((await request('/api/admin/events')).status, 401);
    assert.equal(
      (await request('/api/auth/login', 'POST', { email: 'teste@example.com', password: 'errada' }))
        .status,
      401
    );
    let login = await request('/api/auth/login', 'POST', { email: 'teste@example.com', password });
    assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly/);
    assert.match(login.headers.get('set-cookie'), /SameSite=Strict/);
    assert.equal((await request('/api/auth/session')).status, 200);
    const draft = {
      name: 'Teste de corrida',
      place: 'Brasília · DF',
      type: 'Corrida',
      platform: 'Banlek',
      date: '2026-10-31',
      url: 'https://example.com/album',
      image: '0392',
      status: 'draft',
    };
    assert.equal(
      (await request('/api/admin/events', 'POST', draft, { Origin: 'https://evil.example' }))
        .status,
      403
    );
    assert.equal(
      (await request('/api/admin/events', 'POST', { ...draft, url: 'javascript:alert(1)' })).status,
      400
    );
    assert.equal(
      (
        await request('/api/admin/events', 'POST', {
          ...draft,
          url: 'https://user:secret@example.com',
        })
      ).status,
      400
    );
    assert.equal(
      (await request('/api/admin/events', 'POST', { ...draft, date: '2026-02-30' })).status,
      400
    );
    assert.equal(
      (await request('/api/admin/events', 'POST', { ...draft, image: '../../admin.json' })).status,
      400
    );
    const created = await request('/api/admin/events', 'POST', draft);
    assert.equal(created.status, 201);
    const id = created.data.event.id;
    assert.equal((await request('/api/events')).data.events.length, 0);
    assert.equal((await request('/api/admin/events')).data.events.length, 1);
    const published = {
      ...draft,
      status: 'published',
      name: 'Evento publicado',
      place: 'Parque da Cidade',
    };
    const update = await request(`/api/admin/events/${id}`, 'PUT', published);
    assert.equal(update.status, 200);
    assert.equal(update.data.event.place, 'Parque da Cidade');
    assert.equal(update.data.event.type, 'Corrida');
    assert.equal(update.data.event.platform, 'Banlek');
    const publicEvents = (await request('/api/events')).data.events;
    assert.equal(publicEvents[0].name, 'Evento publicado');
    assert.equal(publicEvents[0].status, undefined);
    assert.equal((await fetch(origin + '/eventos/' + id)).status, 200);
    assert.equal((await request('/api/events/' + id)).status, 200);
    assert.ok((await (await fetch(origin + '/sitemap.xml')).text()).includes('/eventos/' + id));
    assert.equal((await fetch(origin + '/social/cover')).headers.get('content-type'), 'image/webp');
    assert.equal((await fetch(origin + '/social/' + id)).status, 200);
    assert.ok((await (await fetch(origin + '/')).text()).includes('rel="canonical"'));

    let upload = await fetch(origin + '/api/admin/uploads', {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'image/svg+xml' },
      body: '<svg></svg>',
    });
    assert.equal(upload.status, 415);
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1XkAAAAASUVORK5CYII=',
      'base64'
    );
    upload = await fetch(origin + '/api/admin/uploads', {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'image/png' },
      body: png,
    });
    assert.equal(upload.status, 201);
    const image = (await upload.json()).image;
    assert.equal((await fetch(origin + image)).status, 200);
    assert.equal(
      (await request(`/api/admin/events/${id}`, 'PUT', { ...published, image })).status,
      200
    );
    assert.equal(
      (
        await request(
          '/api/admin/categories',
          'POST',
          { kind: 'album', name: 'Ciclismo' },
          { Origin: 'https://evil.example' }
        )
      ).status,
      403
    );
    assert.equal(
      (await request('/api/admin/categories', 'POST', { kind: 'other', name: 'Inválido' })).status,
      400
    );
    assert.equal(
      (await request('/api/admin/categories', 'POST', { kind: 'album', name: 'Todos' })).status,
      400
    );
    assert.equal(
      (await request('/api/admin/categories', 'POST', { kind: 'photo', name: ' ' })).status,
      400
    );
    assert.equal(
      (await request('/api/admin/categories', 'POST', { kind: 'photo', name: 'x'.repeat(61) }))
        .status,
      400
    );
    const albumCategory = await request('/api/admin/categories', 'POST', {
      kind: 'album',
      name: 'Ciclismo',
    });
    assert.equal(albumCategory.status, 201);
    const photoCategory = await request('/api/admin/categories', 'POST', {
      kind: 'photo',
      name: 'Ação',
    });
    assert.equal(photoCategory.status, 201);
    assert.equal(
      (await request('/api/admin/categories', 'POST', { kind: 'photo', name: ' acao ' })).status,
      409
    );
    const categoryId = albumCategory.data.category.id,
      photoId = photoCategory.data.category.id;
    assert.equal(
      (await request('/api/admin/events', 'POST', { ...draft, type: 'Natação não cadastrada' }))
        .status,
      400
    );
    assert.equal(
      (await request('/api/admin/events', 'POST', { ...draft, photo_type: 'Desconhecido' })).status,
      400
    );
    assert.equal(
      (await request('/api/admin/events', 'POST', { ...draft, photo_type: 42 })).status,
      400
    );
    assert.equal(
      (
        await request('/api/admin/events/' + id, 'PUT', {
          ...published,
          type: 'Ciclismo',
          photo_type: 'Ação',
          image,
        })
      ).status,
      200
    );
    assert.equal((await request('/api/events')).data.events[0].photo_type, 'Ação');
    assert.equal((await request('/api/admin/categories/' + categoryId, 'DELETE')).status, 409);
    assert.equal((await request('/api/admin/categories/' + photoId, 'DELETE')).status, 409);
    assert.equal(
      (
        await request('/api/admin/categories/' + categoryId, 'PUT', {
          kind: 'photo',
          name: 'Ciclismo',
        })
      ).status,
      400
    );
    assert.equal(
      (
        await request('/api/admin/categories/' + categoryId, 'PUT', {
          kind: 'album',
          name: 'Futebol',
        })
      ).status,
      409
    );
    assert.equal(
      (
        await request('/api/admin/categories/' + categoryId, 'PUT', {
          kind: 'album',
          name: 'Mountain Bike',
        })
      ).status,
      200
    );
    assert.equal(
      (
        await request('/api/admin/categories/' + photoId, 'PUT', {
          kind: 'photo',
          name: 'Esporte em ação',
        })
      ).status,
      200
    );
    assert.equal((await request('/api/events')).data.events[0].type, 'Mountain Bike');
    assert.equal((await request('/api/events')).data.events[0].photo_type, 'Esporte em ação');
    assert.ok(
      (await request('/api/events')).data.categories.some((c) => c.name === 'Mountain Bike')
    );
    const initialContent = await request('/api/content');
    assert.equal(initialContent.status, 200);
    assert.equal(initialContent.data.content.bioName, 'Lucas Martins');
    const page = await (await fetch(origin + '/')).text();
    assert.equal((page.match(/class="testimonial-card"/g) || []).length, 6);
    assert.ok(!page.includes('depoimentos e nomes abaixo são fictícios'));
    assert.equal(initialContent.data.content.testimonialsMode, 'hidden');
    assert.equal(initialContent.data.content.siteStage, 'live');
    assert.ok(!page.includes('PROJETO EM DESENVOLVIMENTO'));
    assert.equal(
      initialContent.data.fields.filter((field) => field.key.startsWith('testimonialImage')).length,
      6
    );
    assert.ok(initialContent.data.fields.some((field) => field.key === 'heroSlide2'));
    assert.ok(initialContent.data.fields.some((field) => field.key === 'heroSlide3'));

    for (const field of initialContent.data.fields.filter((field) =>
      field.selector.startsWith('#')
    )) {
      assert.ok(
        page.includes('id="' + field.selector.slice(1) + '"'),
        field.key + ' precisa de um destino no site'
      );
    }
    assert.ok(initialContent.data.fields.every((field) => !field.label.includes('?')));
    const content = {
      ...initialContent.data.content,
      biography: 'Fotógrafo esportivo.\nUma história real.',
      heroTitle: 'Novos momentos',
      heroCredit: 'Foto: Lucas Martins',
      heroCreditUrl: '',
      hero: { src: image, alt: 'Foto de corrida', position: '50% 0%' },
      portrait: { src: image, alt: 'Retrato do fotógrafo', position: '50% 50%' },
    };
    assert.equal(
      (await request('/api/admin/content', 'PUT', content, { Origin: 'https://evil.example' }))
        .status,
      403
    );
    assert.equal(
      (
        await request('/api/admin/content', 'PUT', {
          ...content,
          heroCreditUrl: 'javascript:alert(1)',
        })
      ).status,
      400
    );
    assert.equal(
      (
        await request('/api/admin/content', 'PUT', {
          ...content,
          hero: { ...content.hero, src: '/.local/admin.json' },
        })
      ).status,
      400
    );
    assert.equal(
      (
        await request('/api/admin/content', 'PUT', {
          ...content,
          hero: { ...content.hero, src: '/uploads/00000000-0000-0000-0000-000000000000.jpg' },
        })
      ).status,
      400
    );
    assert.equal(
      (await request('/api/admin/content', 'PUT', { ...content, biography: 'x'.repeat(5001) }))
        .status,
      400
    );
    assert.equal(
      (
        await request('/api/admin/content', 'PUT', {
          ...content,
          hero: { ...content.hero, position: 'invalid' },
        })
      ).status,
      400
    );
    assert.equal((await request('/api/admin/content', 'PUT', content)).status, 200);
    assert.deepEqual((await request('/api/content')).data.content, content);

    await stop();
    await start();
    assert.equal((await request('/api/events')).data.events[0].type, 'Mountain Bike');
    assert.equal((await request('/api/events')).data.events[0].photo_type, 'Esporte em ação');
    assert.ok((await request('/api/categories')).data.categories.some((c) => c.id === photoId));
    assert.deepEqual((await request('/api/content')).data.content, content);
    assert.deepEqual((await request('/api/admin/content')).data.content, content);
    assert.equal((await request('/api/events')).data.events[0].image, image);
    assert.equal((await request('/api/auth/session')).status, 200);
    assert.equal((await request(`/api/admin/events/${id}`, 'PUT', draft)).status, 200);
    assert.equal((await request('/api/events')).data.events.length, 0);
    assert.equal((await fetch(origin + '/eventos/' + id)).status, 404);
    assert.equal((await request('/api/events/' + id)).status, 404);
    assert.equal((await request(`/api/admin/events/${id}`, 'DELETE')).status, 200);
    assert.equal((await request(`/api/admin/events/${id}`, 'DELETE')).status, 404);
    assert.equal((await request('/api/admin/categories/' + categoryId, 'DELETE')).status, 200);
    assert.equal((await request('/api/admin/categories/' + photoId, 'DELETE')).status, 200);
    assert.equal((await request('/api/admin/categories/' + photoId, 'DELETE')).status, 404);
    assert.equal((await fetch(origin + '/.local/admin.json')).status, 404);
    assert.equal((await fetch(origin + '/backend/server.mjs')).status, 404);
    for (const path of [
      '/',
      '/style.css',
      '/app.js',
      '/content.js',
      '/admin/',
      '/admin/admin.js',
      '/admin/admin.css',
    ]) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
      if (path === '/' || path === '/admin/')
        assert.match(response.headers.get('content-type'), /text\/html/);
      if (path.startsWith('/admin/'))
        assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
    }
    assert.equal((await request('/api/auth/logout', 'POST')).status, 200);
    assert.equal((await request('/api/admin/events')).status, 401);
    assert.equal((await request('/api/admin/events', 'POST', draft)).status, 401);
    for (let i = 0; i < 10; i++)
      assert.equal(
        (
          await request('/api/auth/login', 'POST', {
            email: 'teste@example.com',
            password: 'errada',
          })
        ).status,
        401
      );
    assert.equal(
      (await request('/api/auth/login', 'POST', { email: 'teste@example.com', password })).status,
      429
    );
  } finally {
    await stop();
    await rm(dataDir, { recursive: true, force: true });
  }
});
