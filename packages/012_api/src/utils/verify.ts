import { env } from 'cloudflare:workers';
import { Bytes, Hash, Hex } from 'ox';

export interface HashFunctionOutput {
	hash: bigint;
	digest: `0x${string}`;
}

function hashEncodedBytes(input: Hex.Hex | Bytes.Bytes): HashFunctionOutput {
	const hash = BigInt(Hash.keccak256(input, { as: 'Hex' })) >> 8n;
	const rawDigest = hash.toString(16);

	return { hash, digest: `0x${rawDigest.padStart(64, '0')}` };
}

function hashString(input: string): HashFunctionOutput {
	const bytesInput = Buffer.from(input);

	return hashEncodedBytes(bytesInput);
}

export function hashToField(input: Bytes.Bytes | string): HashFunctionOutput {
	if (Bytes.validate(input) || Hex.validate(input)) return hashEncodedBytes(input);

	return hashString(input);
}

export interface VerifyProofParams {
	nullifier_hash: string;
	merkle_root: string;
	proof: string;
	verification_level: string;
	action: string;
	signal_hash: string;
}

// Success response
export interface VerifyProofSuccessResponse {
	success: true;
	action: string;
	nullifier_hash: string;
	created_at: string;
}

// Error response types
export interface VerifyProofErrorResponse {
	success: false;
	code: string;
	detail: string;
	attribute: string | null;
}

// Specific error codes
export type VerifyProofErrorCode =
	| 'invalid_proof'
	| 'invalid_merkle_root'
	| 'invalid_credential_type'
	| 'exceeded_max_verifications'
	| 'already_verified';

// Union type for all possible responses
export type VerifyProofResponse = VerifyProofSuccessResponse | VerifyProofErrorResponse;

export async function verifyProof(params: VerifyProofParams): Promise<VerifyProofResponse> {
	const response = await fetch(`https://developer.worldcoin.org/api/v2/verify/${env.WORLD_APP_ID}`, {
		method: 'POST',
		headers: {
			'User-Agent': 'Cloudflare-Worker',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(params),
	});

	const data = (await response.json()) as VerifyProofResponse;
	return data;
}

export function parseVerificationLevel(verification_level: string): 1 | 2 {
	switch (verification_level) {
		case 'device':
			return 1;
		case 'orb':
			return 2;
		default:
			throw new Error(`Invalid verification level: ${verification_level}`);
	}
}
