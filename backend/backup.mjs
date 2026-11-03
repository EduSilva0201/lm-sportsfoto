import { DatabaseSync, backup } from 'node:sqlite';
import { cp, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
export async function backupLocal(sourceDir, destination) {
  const database = resolve(sourceDir, 'lm.sqlite');
  if (!existsSync(database)) throw Error('Banco local não encontrado.');
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(database, { readOnly: true });
  try {
    await backup(db, resolve(destination, 'lm.sqlite'));
  } finally {
    db.close();
  }
  if (existsSync(resolve(sourceDir, 'uploads')))
    await cp(resolve(sourceDir, 'uploads'), resolve(destination, 'uploads'), {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
  if (existsSync(resolve(sourceDir, 'admin.json')))
    await cp(resolve(sourceDir, 'admin.json'), resolve(destination, 'admin.json'), {
      errorOnExist: true,
      force: false,
    });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destination = resolve('.backups', new Date().toISOString().replace(/[:.]/g, '-'));
  await backupLocal(resolve('.local'), destination);
  console.log(
    'Backup local concluído. Guarde a pasta .backups em local protegido; ela contém seu acesso administrativo.'
  );
}
