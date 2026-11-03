import { DatabaseSync } from 'node:sqlite';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export async function exportPublicData(sourceDir, outputDir) {
  const database = resolve(sourceDir, 'lm.sqlite');
  if (!existsSync(database)) throw Error('Banco local não encontrado.');
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    const categories = db.prepare('SELECT id,kind,name,normalized_name FROM categories').all();
    const events = db.prepare('SELECT * FROM events').all();
    const saved = db.prepare('SELECT content FROM site_content WHERE id=1').get();
    const quote = (value) => "'" + String(value ?? '').replaceAll("'", "''") + "'";
    const statements = [
      '-- Somente categorias, eventos e conteúdo. Sem credenciais e sem sessões.',
    ];
    for (const category of categories)
      statements.push(
        'INSERT OR IGNORE INTO categories(id,kind,name,normalized_name) VALUES (' +
          Object.values(category).map(quote).join(',') +
          ');'
      );
    const columns = [
      'id',
      'name',
      'type',
      'platform',
      'place',
      'date',
      'url',
      'image',
      'status',
      'created_at',
      'updated_at',
      'photo_type',
      'description',
    ];
    for (const event of events)
      statements.push(
        'INSERT OR IGNORE INTO events(' +
          columns.join(',') +
          ') VALUES (' +
          columns.map((column) => quote(event[column])).join(',') +
          ');'
      );
    if (saved)
      statements.push(
        'INSERT OR IGNORE INTO site_content(id,content) VALUES (1,' + quote(saved.content) + ');'
      );
    await mkdir(outputDir, { recursive: true });
    await writeFile(resolve(outputDir, 'public-data.sql'), statements.join('\n') + '\n');
    const images = new Set(
      events.map((event) => event.image).filter((image) => image.startsWith('/uploads/'))
    );
    if (saved)
      for (const value of Object.values(JSON.parse(saved.content)))
        if (value?.src?.startsWith('/uploads/')) images.add(value.src);
    const uploads = [];
    await mkdir(resolve(outputDir, 'uploads'), { recursive: true });
    for (const image of images) {
      if (!/^\/uploads\/[a-f0-9-]{36}\.(jpg|png|webp)$/.test(image)) continue;
      const key = image.slice(9);
      await cp(resolve(sourceDir, 'uploads', key), resolve(outputDir, 'uploads', key));
      uploads.push(key);
    }
    await writeFile(resolve(outputDir, 'uploads.json'), JSON.stringify(uploads, null, 2) + '\n');
    return { events: events.length, categories: categories.length, uploads: uploads.length };
  } finally {
    db.close();
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await exportPublicData(resolve('.local'), resolve('.cloudflare-import'));
  console.log('Exportação preparada em .cloudflare-import:', result);
}
