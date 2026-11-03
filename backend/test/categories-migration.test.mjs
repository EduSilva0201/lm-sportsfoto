import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { createApp } from '../server.mjs';

test('migração de categorias preserva eventos, sessões e conteúdo existentes', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'lm-category-migration-'));
  let app;
  try {
    const db = new DatabaseSync(join(dataDir, 'lm.sqlite'));
    for (const name of ['0001_events.sql', '0002_site_content.sql'])
      db.exec(await readFile(new URL('../migrations/' + name, import.meta.url), 'utf8'));
    db.exec('CREATE TABLE schema_migrations (name TEXT PRIMARY KEY)');
    for (const name of ['0001_events.sql', '0002_site_content.sql'])
      db.prepare('INSERT INTO schema_migrations VALUES (?)').run(name);
    const values = [
      'legacy-event',
      'Evento já cadastrado',
      'Corrida',
      'Banlek',
      'Brasília',
      '2026-10-31',
      'https://example.com/album',
      '0392',
      'published',
      '2026-10-01',
      '2026-10-02',
    ];
    db.prepare('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(...values);
    db.prepare('INSERT INTO sessions VALUES (?,?)').run('existing-session', 123456789);
    db.prepare('INSERT INTO site_content VALUES (1,?)').run(
      JSON.stringify({ biography: 'História existente' })
    );
    db.close();
    await writeFile(join(dataDir, 'admin.json'), 'preservar arquivo sem leitura');
    app = createApp({ dataDir });
    app.listen(0, '127.0.0.1');
    await once(app, 'listening');
    const origin = 'http://127.0.0.1:' + app.address().port;
    const result = await (await fetch(origin + '/api/events')).json();
    assert.equal(result.events[0].id, 'legacy-event');
    assert.equal(result.events[0].type, 'Corrida');
    assert.equal(result.events[0].photo_type, '');
    assert.equal(
      (await (await fetch(origin + '/api/content')).json()).content.biography,
      'História existente'
    );
    const migrated = new DatabaseSync(join(dataDir, 'lm.sqlite'));
    const row = migrated.prepare('SELECT * FROM events WHERE id=?').get('legacy-event');
    assert.deepEqual(Object.values(row).slice(0, 11), values);
    assert.equal(migrated.prepare('SELECT COUNT(*) AS count FROM sessions').get().count, 1);
    assert.equal(migrated.prepare('SELECT COUNT(*) AS count FROM categories').get().count, 2);
    migrated.close();
    assert.equal(
      await readFile(join(dataDir, 'admin.json'), 'utf8'),
      'preservar arquivo sem leitura'
    );
  } finally {
    if (app) {
      app.closeAllConnections();
      await new Promise((resolve) => app.close(resolve));
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});
