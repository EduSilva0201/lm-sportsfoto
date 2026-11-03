import { createRemoteJWKSet, jwtVerify } from 'jose';
import fields from '../backend/content-fields.json' with { type: 'json' };
import { fail, validateEvent, validateContent, imageType } from '../backend/validation.mjs';
import {
  renderHome,
  renderEvent,
  sitemap,
  imagePath,
  socialBytes,
} from '../backend/publishing.mjs';
const defaults = Object.fromEntries(fields.map((field) => [field.key, field.value]));
const keySets = new Map();
export async function verifyAccess(request, env, keyResolver) {
  const team = env.ACCESS_TEAM_DOMAIN?.replace(/\/$/, '');
  if (
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team || '') ||
    !env.ACCESS_AUD ||
    env.ACCESS_AUD.startsWith('CONFIGURAR')
  )
    fail(503, 'Configure o Cloudflare Access antes de abrir o painel.');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) fail(401, 'Entre pelo acesso protegido do painel.');
  try {
    if (!keyResolver) {
      if (!keySets.has(team))
        keySets.set(team, createRemoteJWKSet(new URL(team + '/cdn-cgi/access/certs')));
      keyResolver = keySets.get(team);
    }
    const { payload } = await jwtVerify(token, keyResolver, {
      issuer: team,
      audience: env.ACCESS_AUD,
      algorithms: ['RS256'],
    });
    const allowed = (env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (typeof payload.email !== 'string' || !allowed.includes(payload.email.toLowerCase()))
      fail(403, 'Este acesso não está autorizado para administrar o site.');
    return payload;
  } catch (error) {
    if (error.status) throw error;
    fail(401, 'Acesso expirado ou inválido. Entre novamente pelo painel.');
  }
}
async function readBody(request, limit) {
  if (Number(request.headers.get('content-length')) > limit)
    fail(413, 'Arquivo ou solicitação muito grande.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      fail(413, 'Arquivo ou solicitação muito grande.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function jsonBody(request) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json')
    fail(415, 'Envie JSON.');
  try {
    return JSON.parse(new TextDecoder().decode(await readBody(request, 65536)));
  } catch (error) {
    if (error.status) throw error;
    fail(400, 'JSON inválido.');
  }
}
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
function secure(response, path) {
  const result = new Response(response.body, response);
  result.headers.set('X-Content-Type-Options', 'nosniff');
  result.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  result.headers.set('X-Frame-Options', 'SAMEORIGIN');
  result.headers.set('Strict-Transport-Security', 'max-age=31536000');
  result.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  result.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'"
  );
  if (path.startsWith('/admin') || path.startsWith('/api/')) {
    result.headers.set('Cache-Control', 'no-store');
    if (path.startsWith('/admin')) result.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return result;
}
export function createWorker({ accessKeyResolver } = {}) {
  return {
    async fetch(request, env) {
      const path = new URL(request.url).pathname;
      let response;
      try {
        response = await handle(request, env, accessKeyResolver);
      } catch (error) {
        response = json(
          { error: error.status ? error.message : 'Não foi possível concluir. Tente novamente.' },
          error.status || 500
        );
      }
      if (request.method === 'HEAD') response = new Response(null, response);
      return secure(response, path);
    },
  };
}
async function handle(request, env, keyResolver) {
  const url = new URL(request.url),
    path = url.pathname;
  let configured;
  try {
    configured = new URL(env.PUBLIC_ORIGIN);
  } catch {
    fail(503, 'Configure o domínio público do site.');
  }
  if (
    configured.origin !== env.PUBLIC_ORIGIN ||
    !(
      ['https:'].includes(configured.protocol) ||
      (['localhost', '127.0.0.1'].includes(configured.hostname) && configured.protocol === 'http:')
    )
  )
    fail(503, 'Configure uma origem pública HTTPS válida.');
  const origin = configured.origin;
  if (url.origin !== origin) fail(403, 'Domínio não autorizado.');
  const all = async (sql, ...args) =>
    (
      await env.DB.prepare(sql)
        .bind(...args)
        .all()
    ).results;
  const first = async (sql, ...args) =>
    env.DB.prepare(sql)
      .bind(...args)
      .first();
  const run = async (sql, ...args) =>
    env.DB.prepare(sql)
      .bind(...args)
      .run();
  const content = async () => ({
    ...defaults,
    ...JSON.parse((await first('SELECT content FROM site_content WHERE id=1'))?.content || '{}'),
  });
  const categories = () => all('SELECT id,kind,name FROM categories ORDER BY name COLLATE NOCASE');
  const published = () =>
    all(
      "SELECT id,name,type,photo_type,description,platform,place,date,url,image FROM events WHERE status='published' ORDER BY date DESC,created_at DESC"
    );
  const publicEvent = (id) =>
    first(
      "SELECT id,name,type,photo_type,description,platform,place,date,url,image FROM events WHERE status='published' AND id=?",
      id
    );
  const asset = (path) => env.ASSETS.fetch(new Request(new URL(path, origin), { method: 'GET' }));
  const imageExists = async (src) =>
    src.startsWith('/uploads/')
      ? !!(await env.UPLOADS.head(src.slice(9)))
      : (await env.ASSETS.fetch(new Request(new URL(src, origin), { method: 'HEAD' }))).ok;
  if (path.startsWith('/api/')) {
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(request.method))
      fail(405, 'Método não permitido.');
    if (request.method !== 'GET' && request.headers.get('origin') !== origin)
      fail(403, 'Origem não autorizada.');
    if (path === '/api/health' && request.method === 'GET')
      return json({ ok: true, mode: 'cloudflare' });
    if (path === '/api/events' && request.method === 'GET')
      return json({ events: await published(), categories: await categories() });
    const eventMatch = /^\/api\/events\/([a-f0-9-]{36})$/.exec(path);
    if (eventMatch && request.method === 'GET') {
      const event = await publicEvent(eventMatch[1]);
      if (!event) fail(404, 'Evento não encontrado.');
      return json({ event });
    }
    if (path === '/api/content' && request.method === 'GET')
      return json({ content: await content(), fields });
    if (path === '/api/categories' && request.method === 'GET')
      return json({ categories: await categories() });
    await verifyAccess(request, env, keyResolver);
    if (path === '/api/auth/session' && request.method === 'GET')
      return json({ ok: true, mode: 'cloudflare' });
    if (path === '/api/auth/logout' && request.method === 'POST')
      return json({
        ok: true,
        logoutUrl: env.ACCESS_TEAM_DOMAIN.replace(/\/$/, '') + '/cdn-cgi/access/logout',
      });
    if (path === '/api/auth/login') fail(409, 'Acesse /admin/ para entrar pelo Cloudflare Access.');
    if (path === '/api/admin/content' && request.method === 'GET')
      return json({ content: await content(), fields });
    if (path === '/api/admin/content' && request.method === 'PUT') {
      const validated = await validateContent(await jsonBody(request), fields, imageExists);
      await run(
        'INSERT INTO site_content (id,content) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content',
        JSON.stringify(validated)
      );
      return json({ content: validated });
    }
    if (path === '/api/admin/categories' && request.method === 'GET')
      return json({ categories: await categories() });
    const categoryMatch = /^\/api\/admin\/categories\/([a-z0-9-]{1,64})$/.exec(path);
    if (
      (path === '/api/admin/categories' && request.method === 'POST') ||
      (categoryMatch && request.method === 'PUT')
    ) {
      const input = await jsonBody(request);
      if (
        !input ||
        !['album', 'photo'].includes(input.kind) ||
        typeof input.name !== 'string' ||
        !input.name.trim() ||
        input.name.trim().length > 60 ||
        /[\u0000-\u001f\u007f]/.test(input.name)
      )
        fail(400, 'Informe um nome de até 60 caracteres e um grupo válido.');
      const name = input.name.trim(),
        normalized = name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLocaleLowerCase('pt-BR');
      if (['todos', 'todas'].includes(normalized))
        fail(400, 'Escolha um nome diferente de Todos ou Todas.');
      const id = categoryMatch?.[1] || crypto.randomUUID(),
        previous = categoryMatch && (await first('SELECT * FROM categories WHERE id=?', id));
      if (categoryMatch && !previous) fail(404, 'Categoria não encontrada.');
      if (previous && previous.kind !== input.kind)
        fail(400, 'O grupo da categoria não pode ser alterado.');
      if (
        await first(
          'SELECT id FROM categories WHERE kind=? AND normalized_name=? AND id<>?',
          input.kind,
          normalized,
          id
        )
      )
        fail(409, 'Já existe uma categoria com esse nome neste grupo.');
      try {
        if (previous) {
          const column = previous.kind === 'album' ? 'type' : 'photo_type';
          await env.DB.batch([
            env.DB.prepare('UPDATE categories SET name=?,normalized_name=? WHERE id=?').bind(
              name,
              normalized,
              id
            ),
            env.DB.prepare(
              'UPDATE events SET ' + column + '=?,updated_at=? WHERE ' + column + '=?'
            ).bind(name, new Date().toISOString(), previous.name),
          ]);
        } else
          await run('INSERT INTO categories VALUES (?,?,?,?)', id, input.kind, name, normalized);
      } catch (error) {
        if (error.message?.includes('UNIQUE'))
          fail(409, 'Já existe uma categoria com esse nome neste grupo.');
        throw error;
      }
      return json({ category: { id, kind: input.kind, name } }, previous ? 200 : 201);
    }
    if (categoryMatch && request.method === 'DELETE') {
      const category = await first('SELECT * FROM categories WHERE id=?', categoryMatch[1]);
      if (!category) fail(404, 'Categoria não encontrada.');
      const column = category.kind === 'album' ? 'type' : 'photo_type';
      const result = await run(
        'DELETE FROM categories WHERE id=? AND NOT EXISTS (SELECT 1 FROM events WHERE ' +
          column +
          '=?)',
        category.id,
        category.name
      );
      if (!result.meta.changes)
        fail(409, 'Esta categoria está em uso. Troque a categoria nos eventos antes de excluí-la.');
      return json({ ok: true });
    }
    if (path === '/api/admin/uploads' && request.method === 'POST') {
      const bytes = await readBody(request, 5 * 1024 * 1024),
        type = request.headers.get('content-type'),
        extension = imageType(bytes, type),
        name = crypto.randomUUID() + '.' + extension;
      await env.UPLOADS.put(name, bytes, {
        httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
      });
      return json({ image: '/uploads/' + name }, 201);
    }
    if (path === '/api/admin/events' && request.method === 'GET')
      return json({ events: await all('SELECT * FROM events ORDER BY date DESC,created_at DESC') });
    const editMatch = /^\/api\/admin\/events\/([a-f0-9-]{36})$/.exec(path);
    if (
      (path === '/api/admin/events' && request.method === 'POST') ||
      (editMatch && request.method === 'PUT')
    ) {
      const event = validateEvent(await jsonBody(request), await categories());
      if (event.image.startsWith('/uploads/') && !(await imageExists(event.image)))
        fail(400, 'Capa não encontrada. Envie novamente.');
      const now = new Date().toISOString(),
        id = editMatch?.[1] || crypto.randomUUID();
      if (editMatch) {
        const result = await run(
          'UPDATE events SET name=?,place=?,type=?,platform=?,date=?,url=?,image=?,status=?,photo_type=?,description=?,updated_at=? WHERE id=?',
          ...Object.values(event),
          now,
          id
        );
        if (!result.meta.changes) fail(404, 'Evento não encontrado.');
      } else
        await run(
          'INSERT INTO events (name,place,type,platform,date,url,image,status,photo_type,description,id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
          ...Object.values(event),
          id,
          now,
          now
        );
      return json(
        { event: await first('SELECT * FROM events WHERE id=?', id) },
        editMatch ? 200 : 201
      );
    }
    if (editMatch && request.method === 'DELETE') {
      const result = await run('DELETE FROM events WHERE id=?', editMatch[1]);
      if (!result.meta.changes) fail(404, 'Evento não encontrado.');
      return json({ ok: true });
    }
    fail(404, 'Rota não encontrada.');
  }
  if (!['GET', 'HEAD'].includes(request.method)) fail(405, 'Método não permitido.');
  if (path === '/admin' || path.startsWith('/admin/')) {
    await verifyAccess(request, env, keyResolver);
    if (path === '/admin') return Response.redirect(origin + '/admin/', 308);
    return asset(path);
  }
  if (path.startsWith('/uploads/')) {
    if (!/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))
      fail(404, 'Arquivo não encontrado.');
    const object = await env.UPLOADS.get(path.slice(9));
    if (!object) fail(404, 'Arquivo não encontrado.');
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);
    return new Response(object.body, { headers });
  }
  if (path === '/robots.txt')
    return new Response(
      'User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ' + origin + '/sitemap.xml\n',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  if (path === '/sitemap.xml')
    return new Response(sitemap(origin, await published()), {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  const eventPage = /^\/eventos\/([a-f0-9-]{36})\/?$/.exec(path);
  if (eventPage) {
    const event = await publicEvent(eventPage[1]);
    if (!event) return html(await (await asset('/404.html')).text(), 404);
    return html(
      renderEvent(await (await asset('/event.html')).text(), event, origin, await content())
    );
  }
  const social = /^\/social\/(cover|[a-f0-9-]{36})$/.exec(path);
  if (social) {
    const event = social[1] === 'cover' ? null : await publicEvent(social[1]);
    if (social[1] !== 'cover' && !event) fail(404, 'Imagem não encontrada.');
    const src = event ? imagePath(event.image) : (await content()).hero.src;
    let bytes;
    if (src.startsWith('/uploads/')) {
      const object = await env.UPLOADS.get(src.slice(9));
      if (!object) fail(404, 'Imagem não encontrada.');
      bytes = new Uint8Array(await object.arrayBuffer());
    } else {
      const response = await asset(src);
      if (!response.ok) fail(404, 'Imagem não encontrada.');
      bytes = new Uint8Array(await response.arrayBuffer());
    }
    const image = socialBytes(bytes, src.slice(src.lastIndexOf('.')));
    return new Response(image.bytes, {
      headers: { 'Content-Type': image.type, 'Cache-Control': 'public, max-age=300' },
    });
  }
  if (path === '/' || path === '/index.html')
    return html(renderHome(await (await asset('/index.html')).text(), await content(), origin));
  if (path === '/event.html') return html(await (await asset('/404.html')).text(), 404);
  return asset(path);
}
export default createWorker();
