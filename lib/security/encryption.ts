
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Fallback only for DEV. In prod, this MUST be set.
const SECRET_KEY = process.env.MFA_SECRET_KEY || 'dev_secret_key_32_chars_exactly_!!';
const IV_LENGTH = 16;

if (process.env.NODE_ENV === 'production' && !process.env.MFA_SECRET_KEY) {
    console.warn("WARNING: MFA_SECRET_KEY not set in production. Using insecure default.");
}

function getKey() {
    // Ensure key is 32 bytes
    return crypto.scryptSync(SECRET_KEY, 'salt', 32);
}

export function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
    const parts = text.split(':');
    if (parts.length !== 2) throw new Error("Invalid encrypted text format");

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
