import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

function getKeyBuffer(): Buffer {
  const key = process.env.ARCA_ENCRYPTION_KEY;
  if (!key) throw new Error('ARCA_ENCRYPTION_KEY no configurada');
  return Buffer.from(key.padEnd(32, '0').substring(0, 32));
}

export function encriptarCampo(texto: string): string {
  const keyBuffer = getKeyBuffer();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  let encrypted = cipher.update(texto, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function desencriptarCampo(valorEncriptado: string): string {
  const keyBuffer = getKeyBuffer();
  const [ivHex, encrypted] = valorEncriptado.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
