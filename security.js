// Shared-account UI convenience lock; never a server authorization boundary.
const iterations = 210000;
const hex = bytes => Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
const unhex = value => Uint8Array.from(value.match(/../g), pair => parseInt(pair, 16));

export function validCredential(value) {
    return value?.iterations === iterations && /^[a-f0-9]{32}$/.test(value.salt)
        && /^[a-f0-9]{64}$/.test(value.hash);
}

async function derive(password, salt) {
    if (!globalThis.crypto?.subtle) throw new Error('Password setup requires HTTPS or localhost.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    return hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256)));
}

export async function createCredential(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return { salt: hex(salt), hash: await derive(password, salt), iterations };
}

export async function verifyPassword(password, credential) {
    if (!validCredential(credential)) return false;
    return await derive(password, unhex(credential.salt)) === credential.hash;
}
