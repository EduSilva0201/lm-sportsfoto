import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { tokenHash, verifyPassword } from './auth.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const covers = ['0392','7277','1584','7215','9433','2091','6759','2024'];
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.webp':'image/webp', '.jpg':'image/jpeg', '.png':'image/png', '.ico':'image/x-icon' };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
async function body(req, limit) {
 let length = 0; const chunks = [];
 for await (const chunk of req) { length += chunk.length; if (length > limit) fail(413, 'Arquivo ou solicitação muito grande.'); chunks.push(chunk); }
 return Buffer.concat(chunks);
}
async function jsonBody(req) {
 if ((req.headers['content-type'] || '').split(';')[0] !== 'application/json') fail(415,'Envie JSON.');
 try { return JSON.parse((await body(req, 16384)).toString()); } catch (error) { if (error.status) throw error; fail(400,'JSON inválido.'); }
}
function validate(input) {
 if (!input || typeof input !== 'object' || Array.isArray(input)) fail(400,'Dados inválidos.');
 const limits = { name:120, place:160, type:30, platform:40, date:10, url:2048, image:100, status:20 };
 const event = {};
 for (const [key,max] of Object.entries(limits)) {
  if (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > max) fail(400,`Campo inválido: ${key}.`);
  event[key] = input[key].trim();
 }
 if (!['Corrida','Futebol'].includes(event.type) || !['Foco Radical','Banlek','Outra plataforma'].includes(event.platform) || !['draft','published'].includes(event.status)) fail(400,'Modalidade, plataforma ou situação inválida.');
 if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || !Number.isFinite(Date.parse(event.date)) || new Date(event.date).toISOString().slice(0,10) !== event.date) fail(400,'Data inválida.');
 try { const url = new URL(event.url); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); event.url = url.href; } catch { fail(400,'O link do álbum deve usar HTTPS, sem credenciais.'); }
 if (!covers.includes(event.image) && !/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(event.image)) fail(400,'Selecione ou envie uma capa válida.');
 return event;
}

export function createApp({ dataDir = resolve(root,'.local') } = {}) {
 mkdirSync(dataDir, { recursive:true, mode:0o700 });
 mkdirSync(resolve(dataDir,'uploads'), { recursive:true, mode:0o700 });
 const db = new DatabaseSync(resolve(dataDir,'lm.sqlite'));
 db.exec('PRAGMA journal_mode=WAL;');
 // Only CLI startup applies versioned migrations, never request handlers.
 db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY);');
 const migration = '0001_events.sql';
 if (!db.prepare('SELECT name FROM schema_migrations WHERE name=?').get(migration)) {
  db.exec('BEGIN');
  try { db.exec(readFileSync(resolve(root,'backend/migrations',migration),'utf8')); db.prepare('INSERT INTO schema_migrations VALUES (?)').run(migration); db.exec('COMMIT'); } catch(error) { db.exec('ROLLBACK'); throw error; }
 }
 const attempts = new Map();
 const send = (res,status,data) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data)); };
 const session = req => {
  const token = /(?:^|;\s*)lm_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
  return token && db.prepare('SELECT token_hash FROM sessions WHERE token_hash=? AND expires_at>?').get(tokenHash(token),Date.now());
 };
 const server = createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Cache-Control','no-store');
  try {
   const address = server.address();
   const origin = `http://127.0.0.1:${address.port}`;
   if (req.headers.host !== `127.0.0.1:${address.port}` && req.headers.host !== `localhost:${address.port}`) fail(403,'Host não autorizado.');
   const url = new URL(req.url,origin), path = url.pathname;
   if (path.startsWith('/api/')) {
    if (!['GET','POST','PUT','DELETE'].includes(req.method)) fail(405,'Método não permitido.');
    if (req.method !== 'GET' && ![origin,`http://localhost:${address.port}`].includes(req.headers.origin)) fail(403,'Origem não autorizada.');
    if (path === '/api/health' && req.method === 'GET') return send(res,200,{ok:true,mode:'local'});
    if (path === '/api/auth/login' && req.method === 'POST') {
     const key = req.socket.remoteAddress;
     const now = Date.now();
     let attempt = attempts.get(key);
     if (!attempt || attempt.until < now) { attempt = { count:0, until:now+900000 }; attempts.set(key,attempt); }
     if (attempt.count >= 10) fail(429,'Muitas tentativas. Aguarde 15 minutos.');
     attempt.count++;
     const input = await jsonBody(req);
     const credentialPath = resolve(dataDir,'admin.json');
     if (!existsSync(credentialPath)) fail(503,'Execute npm run admin:setup no computador do administrador.');
     const credentials = JSON.parse(await readFile(credentialPath,'utf8'));
     if (!input || typeof input.password !== 'string' || input.password.length > 128 || typeof input.email !== 'string') fail(401,'E-mail ou senha inválidos.');
     const valid = await verifyPassword(input.password,credentials);
     if (!valid || input.email.trim().toLowerCase() !== credentials.email) fail(401,'E-mail ou senha inválidos.');
     attempts.delete(key);
     db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now);
     const token = randomBytes(32).toString('hex');
     db.prepare('INSERT INTO sessions VALUES (?,?)').run(tokenHash(token),now+28800000);
     res.setHeader('Set-Cookie',`lm_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800`);
     return send(res,200,{ok:true});
    }
    if (path === '/api/events' && req.method === 'GET') return send(res,200,{events:db.prepare("SELECT id,name,type,platform,place,date,url,image FROM events WHERE status='published' ORDER BY date DESC,created_at DESC").all()});
    if (!session(req)) fail(401,'Entre novamente para continuar.');
    if (path === '/api/auth/session' && req.method === 'GET') return send(res,200,{ok:true});
    if (path === '/api/auth/logout' && req.method === 'POST') {
     db.prepare('DELETE FROM sessions WHERE token_hash=?').run(session(req).token_hash);
     res.setHeader('Set-Cookie','lm_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0');
     return send(res,200,{ok:true});
    }
    if (path === '/api/admin/uploads' && req.method === 'POST') {
     const bytes = await body(req,5*1024*1024);
     const type = req.headers['content-type'];
     let extension;
     if(type==='image/jpeg' && bytes.subarray(0,3).equals(Buffer.from([255,216,255]))) extension='jpg';
     if(type==='image/png' && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension='png';
     if(type==='image/webp' && bytes.toString('ascii',0,4)==='RIFF' && bytes.toString('ascii',8,12)==='WEBP') extension='webp';
     if(!extension) fail(415,'Envie uma imagem JPG, PNG ou WebP válida, até 5 MB.');
     const name = `${randomUUID()}.${extension}`;
     await writeFile(resolve(dataDir,'uploads',name),bytes,{flag:'wx',mode:0o600});
     return send(res,201,{image:`/uploads/${name}`});
    }
    if (path === '/api/admin/events' && req.method === 'GET') return send(res,200,{events:db.prepare('SELECT * FROM events ORDER BY date DESC,created_at DESC').all()});
    const match = /^\/api\/admin\/events\/([a-f0-9-]{36})$/.exec(path);
    if ((path === '/api/admin/events' && req.method === 'POST') || (match && req.method === 'PUT')) {
     const event = validate(await jsonBody(req));
     if(event.image.startsWith('/uploads/') && !existsSync(resolve(dataDir,'uploads',event.image.split('/').at(-1)))) fail(400,'Capa não encontrada. Envie novamente.');
     const now = new Date().toISOString(); const id = match?.[1] || randomUUID();
     if(match) {
      const result = db.prepare('UPDATE events SET name=?,place=?,type=?,platform=?,date=?,url=?,image=?,status=?,updated_at=? WHERE id=?').run(...Object.values(event),now,id);
      if(!result.changes) fail(404,'Evento não encontrado.');
     } else db.prepare('INSERT INTO events (name,place,type,platform,date,url,image,status,id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(...Object.values(event),id,now,now);
     return send(res,match?200:201,{event:db.prepare('SELECT * FROM events WHERE id=?').get(id)});
    }
    if(match && req.method === 'DELETE') {
     if(!db.prepare('DELETE FROM events WHERE id=?').run(match[1]).changes) fail(404,'Evento não encontrado.');
     return send(res,200,{ok:true});
    }
    fail(404,'Rota não encontrada.');
   }
   if (!['GET','HEAD'].includes(req.method)) fail(405,'Método não permitido.');
   let file;
   if (path.startsWith('/uploads/')) {
    if(!/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(path)) fail(404,'Arquivo não encontrado.');
    file = resolve(dataDir,'uploads',path.split('/').at(-1));
   } else if (['/admin','/admin/','/admin/admin.js','/admin/admin.css'].includes(path)) {
    file = resolve(root,'backend/admin',path.endsWith('.js')?'admin.js':path.endsWith('.css')?'admin.css':'index.html');
   } else {
    const relative = decodeURIComponent(path === '/'?'/index.html':path);
    if(relative.split('/').some(s=>s.startsWith('.') || s.includes('\\'))) fail(404,'Arquivo não encontrado.');
    file = resolve(root,'dist','.'+relative);
    if(!file.startsWith(resolve(root,'dist')+'/')) fail(404,'Arquivo não encontrado.');
   }
   let bytes; try { bytes = await readFile(file); } catch { fail(404,'Arquivo não encontrado.'); }
   if(file.includes('/backend/admin/')) res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
   res.writeHead(200,{'Content-Type':mime[extname(file)] || 'application/octet-stream'});
   res.end(req.method==='HEAD'?undefined:bytes);
  } catch(error) { send(res,error.status || 500,{error:error.status?error.message:'Não foi possível concluir. Tente novamente.'}); }
 });
 server.on('close',()=>db.close());
 return server;
}
if(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 const port = Number(process.env.PORT || 3000);
 createApp().listen(port,'127.0.0.1',()=>console.log(`Site: http://127.0.0.1:${port} | Painel: http://127.0.0.1:${port}/admin/ (somente local)`));
}
