import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { tokenHash, verifyPassword } from './auth.mjs';
import { fail, validateEvent, validateContent } from './validation.mjs';
import { renderHome, renderEvent, sitemap, imagePath, socialBytes } from './publishing.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function isInside(directory, file) {
  const path = relative(directory, file);
  return (
    path !== '' &&
    path !== '..' &&
    !path.startsWith('../') &&
    !path.startsWith('..\\') &&
    !isAbsolute(path)
  );
}
const contentFields = JSON.parse(
  readFileSync(resolve(root, 'backend/content-fields.json'), 'utf8')
);
const contentDefaults = Object.fromEntries(contentFields.map((field) => [field.key, field.value]));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
async function body(req, limit) {
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > limit) fail(413, 'Arquivo ou solicitação muito grande.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
async function jsonBody(req) {
  if ((req.headers['content-type'] || '').split(';')[0] !== 'application/json')
    fail(415, 'Envie JSON.');
  try {
    return JSON.parse((await body(req, 65536)).toString());
  } catch (error) {
    if (error.status) throw error;
    fail(400, 'JSON inválido.');
  }
}

export function createApp({ dataDir = resolve(root, '.local') } = {}) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  mkdirSync(resolve(dataDir, 'uploads'), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(dataDir, 'lm.sqlite'));
  db.exec('PRAGMA journal_mode=WAL;');
  // Only CLI startup applies versioned migrations, never request handlers.
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY);');
  for (const migration of [
    '0001_events.sql',
    '0002_site_content.sql',
    '0003_categories.sql',
    '0004_event_description.sql',
  ]) {
    if (!db.prepare('SELECT name FROM schema_migrations WHERE name=?').get(migration)) {
      db.exec('BEGIN');
      try {
        db.exec(readFileSync(resolve(root, 'backend/migrations', migration), 'utf8'));
        db.prepare('INSERT INTO schema_migrations VALUES (?)').run(migration);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    }
  }
  const getContent = () => ({
    ...contentDefaults,
    ...JSON.parse(db.prepare('SELECT content FROM site_content WHERE id=1').get()?.content || '{}'),
  });
  const attempts = new Map();
  const send = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };
  const session = (req) => {
    const token = /(?:^|;\s*)lm_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    return (
      token &&
      db
        .prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?')
        .get(tokenHash(token), Date.now())
    );
  };
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const address = server.address();
      const origin = `http://127.0.0.1:${address.port}`;
      if (
        req.headers.host !== `127.0.0.1:${address.port}` &&
        req.headers.host !== `localhost:${address.port}`
      )
        fail(403, 'Host não autorizado.');
      const url = new URL(req.url, origin),
        path = url.pathname;
      if (path.startsWith('/api/')) {
        if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method))
          fail(405, 'Método não permitido.');
        if (
          req.method !== 'GET' &&
          ![origin, `http://localhost:${address.port}`].includes(req.headers.origin)
        )
          fail(403, 'Origem não autorizada.');
        if (path === '/api/health' && req.method === 'GET')
          return send(res, 200, { ok: true, mode: 'local' });
        if (path === '/api/auth/login' && req.method === 'POST') {
          const key = req.socket.remoteAddress;
          const now = Date.now();
          let attempt = attempts.get(key);
          if (!attempt || attempt.until < now) {
            attempt = { count: 0, until: now + 900000 };
            attempts.set(key, attempt);
          }
          if (attempt.count >= 10) fail(429, 'Muitas tentativas. Aguarde 15 minutos.');
          attempt.count++;
          const input = await jsonBody(req);
          const credentialPath = resolve(dataDir, 'admin.json');
          if (!existsSync(credentialPath))
            fail(503, 'Execute npm run admin:setup no computador do administrador.');
          const credentials = JSON.parse(await readFile(credentialPath, 'utf8'));
          if (
            !input ||
            typeof input.password !== 'string' ||
            input.password.length > 128 ||
            typeof input.email !== 'string'
          )
            fail(401, 'E-mail ou senha inválidos.');
          const valid = await verifyPassword(input.password, credentials);
          if (!valid || input.email.trim().toLowerCase() !== credentials.email)
            fail(401, 'E-mail ou senha inválidos.');
          attempts.delete(key);
          db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
          const token = randomBytes(32).toString('hex');
          db.prepare('INSERT INTO sessions VALUES (?,?)').run(tokenHash(token), now + 28800000);
          res.setHeader(
            'Set-Cookie',
            `lm_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800`
          );
          return send(res, 200, { ok: true });
        }
        if (path === '/api/events' && req.method === 'GET')
          return send(res, 200, {
            categories: db
              .prepare('SELECT id,kind,name FROM categories ORDER BY name COLLATE NOCASE')
              .all(),
            events: db
              .prepare(
                "SELECT id,name,type,photo_type,description,platform,place,date,url,image FROM events WHERE status='published' ORDER BY date DESC,created_at DESC"
              )
              .all(),
          });
        const publicEvent = /^\/api\/events\/([a-f0-9-]{36})$/.exec(path);
        if (publicEvent && req.method === 'GET') {
          const event = db
            .prepare(
              "SELECT id,name,type,photo_type,description,platform,place,date,url,image FROM events WHERE id=? AND status='published'"
            )
            .get(publicEvent[1]);
          if (!event) fail(404, 'Evento não encontrado.');
          return send(res, 200, { event });
        }
        if (path === '/api/content' && req.method === 'GET')
          return send(res, 200, { content: getContent(), fields: contentFields });
        if (path === '/api/categories' && req.method === 'GET')
          return send(res, 200, {
            categories: db
              .prepare('SELECT id,kind,name FROM categories ORDER BY name COLLATE NOCASE')
              .all(),
          });
        if (!session(req)) fail(401, 'Entre novamente para continuar.');
        if (path === '/api/admin/categories' && req.method === 'GET')
          return send(res, 200, {
            categories: db
              .prepare('SELECT id,kind,name FROM categories ORDER BY name COLLATE NOCASE')
              .all(),
          });
        const categoryMatch = /^\/api\/admin\/categories\/([a-z0-9-]{1,64})$/.exec(path);
        if (
          (path === '/api/admin/categories' && req.method === 'POST') ||
          (categoryMatch && req.method === 'PUT')
        ) {
          const input = await jsonBody(req);
          if (
            !input ||
            !['album', 'photo'].includes(input.kind) ||
            typeof input.name !== 'string' ||
            !input.name.trim() ||
            input.name.trim().length > 60 ||
            /[\u0000-\u001f\u007f]/.test(input.name)
          )
            fail(400, 'Informe um nome de até 60 caracteres e um grupo válido.');
          const name = input.name.trim();
          const normalized = name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLocaleLowerCase('pt-BR');
          if (['todos', 'todas'].includes(normalized))
            fail(400, 'Escolha um nome diferente de Todos ou Todas.');
          const id = categoryMatch?.[1] || randomUUID();
          const previous =
            categoryMatch && db.prepare('SELECT * FROM categories WHERE id=?').get(id);
          if (categoryMatch && !previous) fail(404, 'Categoria não encontrada.');
          if (previous && previous.kind !== input.kind)
            fail(400, 'O grupo da categoria não pode ser alterado.');
          if (
            db
              .prepare('SELECT id FROM categories WHERE kind=? AND normalized_name=? AND id<>?')
              .get(input.kind, normalized, id)
          )
            fail(409, 'Já existe uma categoria com esse nome neste grupo.');
          db.exec('BEGIN');
          try {
            if (previous) {
              db.prepare('UPDATE categories SET name=?,normalized_name=? WHERE id=?').run(
                name,
                normalized,
                id
              );
              const column = previous.kind === 'album' ? 'type' : 'photo_type';
              db.prepare(
                'UPDATE events SET ' + column + '=?,updated_at=? WHERE ' + column + '=?'
              ).run(name, new Date().toISOString(), previous.name);
            } else
              db.prepare('INSERT INTO categories VALUES (?,?,?,?)').run(
                id,
                input.kind,
                name,
                normalized
              );
            db.exec('COMMIT');
          } catch (error) {
            db.exec('ROLLBACK');
            throw error;
          }
          return send(res, previous ? 200 : 201, { category: { id, kind: input.kind, name } });
        }
        if (categoryMatch && req.method === 'DELETE') {
          const category = db.prepare('SELECT * FROM categories WHERE id=?').get(categoryMatch[1]);
          if (!category) fail(404, 'Categoria não encontrada.');
          const column = category.kind === 'album' ? 'type' : 'photo_type';
          if (db.prepare('SELECT id FROM events WHERE ' + column + '=? LIMIT 1').get(category.name))
            fail(
              409,
              'Esta categoria está em uso. Troque a categoria nos eventos antes de excluí-la.'
            );
          db.prepare('DELETE FROM categories WHERE id=?').run(category.id);
          return send(res, 200, { ok: true });
        }
        if (path === '/api/admin/content' && req.method === 'GET')
          return send(res, 200, { content: getContent(), fields: contentFields });
        if (path === '/api/admin/content' && req.method === 'PUT') {
          const content = await validateContent(await jsonBody(req), contentFields, (src) =>
            existsSync(
              src.startsWith('/uploads/')
                ? resolve(dataDir, 'uploads', src.split('/').at(-1))
                : resolve(root, 'dist', '.' + src)
            )
          );
          db.prepare(
            'INSERT INTO site_content (id,content) VALUES (1,?) ON CONFLICT(id) DO UPDATE SET content=excluded.content'
          ).run(JSON.stringify(content));
          return send(res, 200, { content });
        }
        if (path === '/api/auth/session' && req.method === 'GET')
          return send(res, 200, { ok: true });
        if (path === '/api/auth/logout' && req.method === 'POST') {
          db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session(req).token_hash);
          res.setHeader(
            'Set-Cookie',
            'lm_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0'
          );
          return send(res, 200, { ok: true });
        }
        if (path === '/api/admin/uploads' && req.method === 'POST') {
          const bytes = await body(req, 5 * 1024 * 1024);
          const type = req.headers['content-type'];
          let extension;
          if (type === 'image/jpeg' && bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255])))
            extension = 'jpg';
          if (
            type === 'image/png' &&
            bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          )
            extension = 'png';
          if (
            type === 'image/webp' &&
            bytes.toString('ascii', 0, 4) === 'RIFF' &&
            bytes.toString('ascii', 8, 12) === 'WEBP'
          )
            extension = 'webp';
          if (!extension) fail(415, 'Envie uma imagem JPG, PNG ou WebP válida, até 5 MB.');
          const name = `${randomUUID()}.${extension}`;
          await writeFile(resolve(dataDir, 'uploads', name), bytes, { flag: 'wx', mode: 0o600 });
          return send(res, 201, { image: `/uploads/${name}` });
        }
        if (path === '/api/admin/events' && req.method === 'GET')
          return send(res, 200, {
            events: db.prepare('SELECT * FROM events ORDER BY date DESC,created_at DESC').all(),
          });
        const match = /^\/api\/admin\/events\/([a-f0-9-]{36})$/.exec(path);
        if (
          (path === '/api/admin/events' && req.method === 'POST') ||
          (match && req.method === 'PUT')
        ) {
          const event = validateEvent(
            await jsonBody(req),
            db.prepare('SELECT kind,name FROM categories').all()
          );
          if (
            event.image.startsWith('/uploads/') &&
            !existsSync(resolve(dataDir, 'uploads', event.image.split('/').at(-1)))
          )
            fail(400, 'Capa não encontrada. Envie novamente.');
          const now = new Date().toISOString();
          const id = match?.[1] || randomUUID();
          if (match) {
            const result = db
              .prepare(
                'UPDATE events SET name=?,place=?,type=?,platform=?,date=?,url=?,image=?,status=?,photo_type=?,description=?,updated_at=? WHERE id=?'
              )
              .run(...Object.values(event), now, id);
            if (!result.changes) fail(404, 'Evento não encontrado.');
          } else
            db.prepare(
              'INSERT INTO events (name,place,type,platform,date,url,image,status,photo_type,description,id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
            ).run(...Object.values(event), id, now, now);
          return send(res, match ? 200 : 201, {
            event: db.prepare('SELECT * FROM events WHERE id=?').get(id),
          });
        }
        if (match && req.method === 'DELETE') {
          if (!db.prepare('DELETE FROM events WHERE id=?').run(match[1]).changes)
            fail(404, 'Evento não encontrado.');
          return send(res, 200, { ok: true });
        }
        fail(404, 'Rota não encontrada.');
      }
      if (!['GET', 'HEAD'].includes(req.method)) fail(405, 'Método não permitido.');
      const htmlResponse = (html, status = 200) => {
        res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(req.method === 'HEAD' ? undefined : html);
      };
      const published = () =>
        db
          .prepare(
            "SELECT id,name,type,photo_type,description,platform,place,date,url,image FROM events WHERE status='published' ORDER BY date DESC"
          )
          .all();
      const eventPage = /^\/eventos\/([a-f0-9-]{36})\/?$/.exec(path);
      if (eventPage) {
        const event = published().find((e) => e.id === eventPage[1]);
        if (!event)
          return htmlResponse(await readFile(resolve(root, 'dist/404.html'), 'utf8'), 404);
        return htmlResponse(
          renderEvent(
            await readFile(resolve(root, 'dist/event.html'), 'utf8'),
            event,
            origin,
            getContent()
          )
        );
      }
      if (path === '/robots.txt') {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(
          'User-agent: *\nDisallow: /admin\nDisallow: /api/\nSitemap: ' + origin + '/sitemap.xml\n'
        );
      }
      if (path === '/sitemap.xml') {
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        return res.end(req.method === 'HEAD' ? undefined : sitemap(origin, published()));
      }
      const social = /^\/social\/(cover|[a-f0-9-]{36})$/.exec(path);
      if (social) {
        const event = social[1] === 'cover' ? null : published().find((e) => e.id === social[1]);
        if (social[1] !== 'cover' && !event) fail(404, 'Imagem não encontrada.');
        const src = event ? imagePath(event.image) : getContent().hero.src;
        const bytes = await readFile(
          src.startsWith('/uploads/')
            ? resolve(dataDir, 'uploads', src.split('/').at(-1))
            : resolve(root, 'dist', '.' + src)
        );
        const result = socialBytes(bytes, extname(src));
        res.writeHead(200, { 'Content-Type': result.type });
        return res.end(req.method === 'HEAD' ? undefined : result.bytes);
      }
      if (path === '/' || path === '/index.html')
        return htmlResponse(
          renderHome(await readFile(resolve(root, 'dist/index.html'), 'utf8'), getContent(), origin)
        );
      let file;
      if (path.startsWith('/uploads/')) {
        if (!/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path))
          fail(404, 'Arquivo não encontrado.');
        file = resolve(dataDir, 'uploads', path.split('/').at(-1));
      } else if (['/admin', '/admin/', '/admin/admin.js', '/admin/admin.css'].includes(path)) {
        file = resolve(
          root,
          'backend/admin',
          path.endsWith('.js') ? 'admin.js' : path.endsWith('.css') ? 'admin.css' : 'index.html'
        );
      } else {
        const relative = decodeURIComponent(path === '/' ? '/index.html' : path);
        if (relative.split('/').some((s) => s.startsWith('.') || s.includes('\\')))
          fail(404, 'Arquivo não encontrado.');
        file = resolve(root, 'dist', '.' + relative);
        if (!isInside(resolve(root, 'dist'), file)) fail(404, 'Arquivo não encontrado.');
      }
      let bytes;
      try {
        bytes = await readFile(file);
      } catch {
        fail(404, 'Arquivo não encontrado.');
      }
      if (isInside(resolve(root, 'backend/admin'), file))
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      if (isInside(resolve(root, 'backend/admin'), file))
        res.setHeader(
          'Content-Security-Policy',
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
        );
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      send(res, error.status || 500, {
        error: error.status ? error.message : 'Não foi possível concluir. Tente novamente.',
      });
    }
  });
  server.on('close', () => db.close());
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '127.0.0.1', () =>
    console.log(
      `Site: http://127.0.0.1:${port} | Painel: http://127.0.0.1:${port}/admin/ (somente local)`
    )
  );
}
