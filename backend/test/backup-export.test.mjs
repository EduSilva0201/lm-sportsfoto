import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { backupLocal } from '../backup.mjs';
import { exportPublicData } from '../../cloudflare/export-local.mjs';
test('backup íntegro e exportação Cloudflare sem credenciais nem sessões', async () => {
  const root = await mkdtemp(join(tmpdir(), 'lm-backup-export-')),
    source = join(root, 'source'),
    destination = join(root, 'backup'),
    exported = join(root, 'export');
  try {
    await mkdir(join(source, 'uploads'), { recursive: true });
    const secret = 'acesso-que-nao-pode-ser-exportado';
    await writeFile(join(source, 'admin.json'), secret);
    const id = '00000000-0000-0000-0000-000000000001',
      image = '/uploads/' + id + '.png';
    await writeFile(join(source, 'uploads', id + '.png'), 'imagem-de-teste');
    const schema = await readFile(
      new URL('../../cloudflare/migrations/0001_initial.sql', import.meta.url),
      'utf8'
    );
    const db = new DatabaseSync(join(source, 'lm.sqlite'));
    db.exec(schema);
    db.exec('CREATE TABLE sessions(token TEXT)');
    db.prepare('INSERT INTO sessions VALUES (?)').run(secret);
    db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
      id,
      "Corrida d'água",
      'Corrida',
      'Banlek',
      'Brasília',
      '2026-10-31',
      'https://example.com/album',
      image,
      'published',
      '2026-10-31',
      '2026-10-31',
      '',
      'Descrição'
    );
    db.prepare('INSERT INTO site_content VALUES (1,?)').run(
      JSON.stringify({ hero: { src: image } })
    );
    db.close();
    await backupLocal(source, destination);
    assert.equal(await readFile(join(destination, 'admin.json'), 'utf8'), secret);
    const saved = new DatabaseSync(join(destination, 'lm.sqlite'), { readOnly: true });
    assert.equal(saved.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    assert.equal(saved.prepare('SELECT COUNT(*) AS n FROM events').get().n, 1);
    saved.close();
    const result = await exportPublicData(source, exported);
    assert.deepEqual(result, { events: 1, categories: 2, uploads: 1 });
    const sql = await readFile(join(exported, 'public-data.sql'), 'utf8');
    assert.ok(!sql.includes(secret));
    assert.ok(!sql.includes('INSERT INTO sessions'));
    const imported = new DatabaseSync(':memory:');
    imported.exec(schema);
    imported.exec(sql);
    assert.equal(imported.prepare('SELECT name FROM events').get().name, "Corrida d'água");
    imported.close();
    assert.equal(await readFile(join(exported, 'uploads', id + '.png'), 'utf8'), 'imagem-de-teste');
    assert.equal(await readFile(join(source, 'admin.json'), 'utf8'), secret);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
