import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
const file = '.local/lm.sqlite';
if (existsSync(file)) {
 const db = new DatabaseSync(file);
 db.prepare('DELETE FROM sessions').run();
 db.close();
 console.log('Sessões locais encerradas.');
} else console.log('Nenhum banco local encontrado.');
