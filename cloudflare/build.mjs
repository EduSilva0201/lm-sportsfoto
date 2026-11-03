import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, '.cloudflare-build');
if (dirname(destination) !== root || destination !== resolve(root, '.cloudflare-build'))
  throw Error('Destino de build inválido.');
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(resolve(root, 'dist'), destination, { recursive: true });
await mkdir(resolve(destination, 'admin'), { recursive: true });
for (const file of ['index.html', 'admin.js', 'admin.css'])
  await cp(resolve(root, 'backend/admin', file), resolve(destination, 'admin', file));
await writeFile(resolve(destination, '_headers'), '/admin/*\n  X-Robots-Tag: noindex, nofollow\n');
console.log('Arquivos públicos preparados. Nenhum dado de .local foi incluído.');
