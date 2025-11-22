import { env } from 'cloudflare:workers';
import { Bytes, Hash, Hex } from 'ox';
import { recoverTypedDataAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { HBTPaymaster } from './paymaster';

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

export type ServerSignatureParams = (
	| { action: 'mint'; to: `0x${string}`; tokenId: bigint; tokenURI: string }
	| { action: 'burn'; tokenId: bigint }
) & {
	chainId: string;
	deadline: bigint;
	nonce: bigint;
};

export async function createEIP712ServerSignature<T extends 'mint' | 'burn'>(
	action: T,
	params: T extends 'mint' ? Extract<ServerSignatureParams, { action: 'mint' }> : Extract<ServerSignatureParams, { action: 'burn' }>,
	type: 'device' | 'orb' = 'device'
) {
	const domain = {
		name: type === 'device' ? 'HumanBoundTokenDevice' : 'HumanBoundTokenOrb',
		version: '1',
		chainId: BigInt(params.chainId), // uint256
		verifyingContract: HBTPaymaster.HBT_CONTRACT_ADDRESS.get(type)!,
	} as const;

	const types = {
		MintToken: [
			{ name: 'to', type: 'address' },
			{ name: 'tokenId', type: 'uint256' },
			{ name: 'tokenURI', type: 'string' },
			{ name: 'deadline', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
		],
		BurnToken: [
			{ name: 'tokenId', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
		],
	} as const;

	const primaryType = params.action === 'mint' ? ('MintToken' as const) : ('BurnToken' as const);

	const message =
		params.action === 'mint'
			? {
					to: params.to,
					tokenId: params.tokenId,
					tokenURI: params.tokenURI,
					deadline: params.deadline,
					nonce: params.nonce,
			  }
			: params.action === 'burn'
			? {
					tokenId: params.tokenId,
					deadline: params.deadline,
					nonce: params.nonce,
			  }
			: ({} as any);

	const privateKey = env.SERVER_SIGNER_PRIVATE_KEY as `0x${string}`;
	const account = privateKeyToAccount(privateKey);

	const signature = await account.signTypedData({
		domain,
		types,
		primaryType,
		message: message,
	});

	return {
		signature,
		message: params,
	};
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

export interface VerifyEIP712SignatureParams {
	domain: {
		name: string;
		version: string;
		chainId: number;
		verifyingContract?: `0x${string}`;
	};
	types: Record<string, Array<{ name: string; type: string }>>;
	primaryType: string;
	message: Record<string, any>;
	signature: `0x${string}`;
	signerAddress: string;
}

/**
 * Verifies an EIP-712 typed data signature
 * @param params - The parameters needed to verify the signature
 * @returns true if the signature is valid, false otherwise
 */
export async function verifyEIP712Signature(params: VerifyEIP712SignatureParams): Promise<boolean> {
	try {
		const recoveredAddress = await recoverTypedDataAddress({
			domain: params.domain,
			types: params.types,
			primaryType: params.primaryType,
			message: params.message,
			signature: params.signature,
		});

		// Compare addresses (case-insensitive)
		return recoveredAddress.toLowerCase() === params.signerAddress.toLowerCase();
	} catch (error) {
		console.error('Error verifying EIP-712 signature:', error);
		return false;
	}
}
