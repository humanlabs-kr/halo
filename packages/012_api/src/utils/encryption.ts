/**
 * Encryption utilities for Filecoin storage
 * Uses AES-GCM for authenticated encryption
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes (96 bits for GCM)
const TAG_LENGTH = 128; // bits

/**
 * Derives a CryptoKey from a raw key string
 */
async function getEncryptionKey(keyString: string): Promise<CryptoKey> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(keyString);

	// Derive a key using PBKDF2
	const baseKey = await crypto.subtle.importKey('raw', keyData, { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: new TextEncoder().encode('receipto-synapse-encryption-salt'),
			iterations: 100000,
			hash: 'SHA-256',
		},
		baseKey,
		{ name: ALGORITHM, length: KEY_LENGTH },
		false,
		['encrypt', 'decrypt'],
	);
}

/**
 * Encrypts image data using AES-GCM
 * @param data - The image data to encrypt
 * @param keyString - The encryption key as a string
 * @returns Encrypted data with IV prepended (IV + encrypted data)
 */
export async function encryptImage(data: Uint8Array, keyString: string): Promise<Uint8Array> {
	const key = await getEncryptionKey(keyString);

	// Generate a random IV
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

	// Encrypt the data
	const encryptedData = await crypto.subtle.encrypt(
		{
			name: ALGORITHM,
			iv: iv,
			tagLength: TAG_LENGTH,
		},
		key,
		data,
	);

	// Prepend IV to encrypted data: [IV (12 bytes)][Encrypted data + tag (16 bytes)]
	const result = new Uint8Array(IV_LENGTH + encryptedData.byteLength);
	result.set(iv, 0);
	result.set(new Uint8Array(encryptedData), IV_LENGTH);

	return result;
}

/**
 * Decrypts image data using AES-GCM
 * @param encryptedData - The encrypted data with IV prepended
 * @param keyString - The encryption key as a string
 * @returns Decrypted image data
 */
export async function decryptImage(encryptedData: Uint8Array, keyString: string): Promise<Uint8Array> {
	const key = await getEncryptionKey(keyString);

	// Extract IV from the beginning
	const iv = encryptedData.slice(0, IV_LENGTH);
	const ciphertext = encryptedData.slice(IV_LENGTH);

	// Decrypt the data
	const decryptedData = await crypto.subtle.decrypt(
		{
			name: ALGORITHM,
			iv: iv,
			tagLength: TAG_LENGTH,
		},
		key,
		ciphertext,
	);

	return new Uint8Array(decryptedData);
}
