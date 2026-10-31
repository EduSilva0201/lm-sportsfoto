import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const tokenHash = value => createHash('sha256').update(value).digest('hex');
export async function passwordHash(password, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: (await scrypt(password, salt, 64)).toString('hex') };
}
export async function verifyPassword(password, credentials) {
  const actual = await passwordHash(password, credentials.salt);
  return timingSafeEqual(Buffer.from(actual.hash, 'hex'), Buffer.from(credentials.hash, 'hex'));
}
