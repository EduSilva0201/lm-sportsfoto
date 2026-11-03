import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from 'jose';
import { createWorker } from '../../cloudflare/worker.mjs';

function d1(db) {
  const prepare = (sql) => ({
    sql,
    args: [],
    bind(...args) {
      this.args = args;
      return this;
    },
    async all() {
      return { results: db.prepare(sql).all(...this.args) };
    },
    async first() {
      return db.prepare(sql).get(...this.args) || null;
    },
    async run() {
      return {
        success: true,
        meta: { changes: Number(db.prepare(sql).run(...this.args).changes) },
      };
    },
  });
  return {
    prepare,
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const result = [];
        for (const statement of statements) result.push(await statement.run());
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
test('Worker Cloudflare: autenticação assinada, D1, R2 e páginas públicas', async () => {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(
    await readFile(new URL('../../cloudflare/migrations/0001_initial.sql', import.meta.url), 'utf8')
  );
  const { privateKey, publicKey } = await generateKeyPair('RS256'),
    jwk = await exportJWK(publicKey);
  jwk.kid = 'test-key';
  const worker = createWorker({ accessKeyResolver: createLocalJWKSet({ keys: [jwk] }) });
  const objects = new Map();
  const env = {
    DB: d1(sqlite),
    PUBLIC_ORIGIN: 'https://lm.example',
    ACCESS_TEAM_DOMAIN: 'https://lm-test.cloudflareaccess.com',
    ACCESS_AUD: 'test-audience',
    ADMIN_EMAILS: 'owner@example.com',
    UPLOADS: {
      async head(key) {
        return objects.has(key) ? {} : null;
      },
      async put(key, bytes, options) {
        objects.set(key, { bytes, options });
      },
      async get(key) {
        const value = objects.get(key);
        if (!value) return null;
        return {
          body: value.bytes,
          httpEtag: '"test"',
          arrayBuffer: async () => value.bytes.buffer,
          writeHttpMetadata(headers) {
            headers.set('Content-Type', value.options.httpMetadata.contentType);
          },
        };
      },
    },
    ASSETS: {
      async fetch(request) {
        const path = new URL(request.url).pathname;
        const base = path.startsWith('/admin/') ? 'backend' : 'dist';
        const file = resolve(base, '.' + (path.endsWith('/') ? path + 'index.html' : path));
        try {
          const bytes = await readFile(file);
          return new Response(request.method === 'HEAD' ? null : bytes, {
            headers: {
              'Content-Type':
                extname(file) === '.html'
                  ? 'text/html'
                  : extname(file) === '.svg'
                    ? 'image/svg+xml'
                    : 'application/octet-stream',
            },
          });
        } catch {
          return new Response('Not found', { status: 404 });
        }
      },
    },
  };
  const sign = (email = 'owner@example.com', audience = env.ACCESS_AUD, expires = '1h') =>
    new SignJWT({ email })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(env.ACCESS_TEAM_DOMAIN)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime(expires)
      .sign(privateKey);
  const token = await sign();
  const request = (path, method = 'GET', body, auth = token, extra = {}) =>
    worker.fetch(
      new Request(env.PUBLIC_ORIGIN + path, {
        method,
        headers: {
          Origin: env.PUBLIC_ORIGIN,
          ...(auth ? { 'Cf-Access-Jwt-Assertion': auth } : {}),
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...extra,
        },
        ...(body !== undefined
          ? { body: typeof body === 'string' ? body : JSON.stringify(body) }
          : {}),
      }),
      env
    );
  try {
    assert.equal((await request('/api/health')).status, 200);
    assert.equal((await request('/admin/', 'GET', undefined, null)).status, 401);
    assert.equal((await request('/api/admin/events', 'GET', undefined, 'invalid')).status, 401);
    assert.equal(
      (await request('/api/admin/events', 'GET', undefined, await sign('other@example.com')))
        .status,
      403
    );
    assert.equal(
      (
        await request(
          '/api/admin/events',
          'GET',
          undefined,
          await sign('owner@example.com', 'wrong-audience')
        )
      ).status,
      401
    );
    assert.equal(
      (
        await request(
          '/api/admin/events',
          'GET',
          undefined,
          await sign('owner@example.com', env.ACCESS_AUD, Math.floor(Date.now() / 1000) - 60)
        )
      ).status,
      401
    );
    const admin = await request('/admin/');
    assert.equal(admin.status, 200);
    assert.equal(admin.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.match(admin.headers.get('Content-Security-Policy'), /frame-ancestors 'self'/);
    assert.equal(
      (
        await request('/api/admin/categories', 'POST', { kind: 'album', name: 'Ciclismo' }, token, {
          Origin: 'https://evil.example',
        })
      ).status,
      403
    );
    let category = await request('/api/admin/categories', 'POST', {
      kind: 'album',
      name: 'Ciclismo',
    });
    assert.equal(category.status, 201);
    category = (await category.json()).category;
    const draft = {
      name: "Corrida <script>alert('x')</script>",
      place: 'Brasília · DF',
      type: 'Ciclismo',
      platform: 'Banlek',
      date: '2026-10-31',
      url: 'https://example.com/album',
      image: '0392',
      status: 'draft',
      description: 'Uma descrição completa.',
    };
    let created = await request('/api/admin/events', 'POST', draft);
    assert.equal(created.status, 201);
    const event = (await created.json()).event;
    assert.equal((await request('/api/events/' + event.id, 'GET', undefined, null)).status, 404);
    assert.equal((await request('/eventos/' + event.id, 'GET', undefined, null)).status, 404);
    assert.equal(
      (await request('/api/admin/events/' + event.id, 'PUT', { ...draft, status: 'published' }))
        .status,
      200
    );
    const detail = await request('/eventos/' + event.id, 'GET', undefined, null),
      markup = await detail.text();
    assert.equal(detail.status, 200);
    assert.ok(markup.includes('&lt;script&gt;'));
    assert.ok(!markup.includes("<script>alert('x')"));
    assert.ok(markup.includes('og:image'));
    assert.ok((await (await request('/sitemap.xml')).text()).includes('/eventos/' + event.id));
    assert.equal((await request('/api/admin/categories/' + category.id, 'DELETE')).status, 409);
    assert.equal(
      (
        await request('/api/admin/categories/' + category.id, 'PUT', {
          kind: 'album',
          name: 'Bike',
        })
      ).status,
      200
    );
    assert.equal((await (await request('/api/events/' + event.id)).json()).event.type, 'Bike');
    const initial = (await (await request('/api/content', 'GET', undefined, null)).json()).content;
    assert.equal(
      (await request('/api/admin/content', 'PUT', { ...initial, contactWhatsApp: 'invalid' }))
        .status,
      400
    );
    assert.equal(
      (
        await request('/api/admin/content', 'PUT', {
          ...initial,
          contactWhatsApp: '5511000000000',
          testimonialsMode: 'hidden',
        })
      ).status,
      200
    );
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1XkAAAAASUVORK5CYII=',
      'base64'
    );
    const upload = await worker.fetch(
      new Request(env.PUBLIC_ORIGIN + '/api/admin/uploads', {
        method: 'POST',
        headers: {
          Origin: env.PUBLIC_ORIGIN,
          'Cf-Access-Jwt-Assertion': token,
          'Content-Type': 'image/png',
        },
        body: png,
      }),
      env
    );
    assert.equal(upload.status, 201);
    const image = (await upload.json()).image;
    assert.equal(
      (await request(image, 'GET', undefined, null)).headers.get('Content-Type'),
      'image/png'
    );
    assert.equal(
      (
        await request('/api/admin/content', 'PUT', {
          ...initial,
          hero: { src: image, alt: 'Capa de teste', position: '50% 50%' },
        })
      ).status,
      200
    );
    const social = await request('/social/cover', 'GET', undefined, null);
    assert.equal(social.status, 200);
    assert.equal(social.headers.get('Content-Type'), 'image/png');
    assert.equal((await request('/social/' + event.id, 'GET', undefined, null)).status, 200);
    const home = await request('/', 'GET', undefined, null);
    assert.equal(home.status, 200);
    assert.ok((await home.text()).includes('rel="canonical"'));
    assert.equal((await request('/.local/admin.json', 'GET', undefined, null)).status, 404);
    assert.equal((await request('/api/admin/events/' + event.id, 'DELETE')).status, 200);
    assert.equal((await request('/eventos/' + event.id, 'GET', undefined, null)).status, 404);
  } finally {
    sqlite.close();
  }
});
