import { mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { passwordHash } from './auth.mjs';
const directory = resolve('.local');
await mkdir(directory, { recursive: true, mode: 0o700 });
const file = resolve(directory, 'admin.json');
try { await access(file); console.error('Administrador já configurado. Para redefinir, siga backend/README.md.'); process.exit(1); } catch {}
const rl = createInterface({ input: process.stdin, output: process.stdout });
try {
 const email = (await rl.question('E-mail do administrador: ')).trim().toLowerCase();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('E-mail inválido.');
 console.log('A senha será digitada sem aparecer na tela. Use pelo menos 12 caracteres.');
 // Mute terminal output only while reading the password; no secret enters source control.
 const originalWrite = process.stdout.write.bind(process.stdout);
 process.stdout.write = () => true;
 let password;
 try { password = await rl.question(''); } finally { process.stdout.write = originalWrite; }
 console.log('');
 if (password.length < 12 || password.length > 128) throw new Error('Use uma senha de 12 a 128 caracteres.');
 await writeFile(file, JSON.stringify({ email, ...await passwordHash(password) }), { mode: 0o600, flag: 'wx' });
 console.log('Administrador criado. Execute npm run dev e abra http://127.0.0.1:3000/admin/');
} catch (error) { console.error(error.message); process.exitCode = 1; } finally { rl.close(); }
