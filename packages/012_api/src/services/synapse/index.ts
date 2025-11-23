import { RPC_URLS, TIME_CONSTANTS } from '@filoz/synapse-sdk';
import { env } from 'cloudflare:workers';
import { ethers } from 'ethers';
import { Synapse as SynapseSDK } from '@filoz/synapse-sdk';

export const Synapse = {
	setup: async (amount: string) => {
		try {
			const depositAmount = ethers.parseUnits(amount, 18);
			const synapse = await SynapseSDK.create({
				privateKey: env.SYNAPSE_PRIVATE_KEY,
				rpcURL: RPC_URLS.mainnet.http,
			});
			const tx = await synapse.payments.depositWithPermitAndApproveOperator(
				depositAmount,
				synapse.getWarmStorageAddress(),
				ethers.MaxUint256,
				ethers.MaxUint256,
				TIME_CONSTANTS.EPOCHS_PER_MONTH,
			);
			await tx.wait();
			console.log(`✅ USDFC deposit and Warm Storage service approval successful!`);
		} catch (error) {
			console.error('Error setting up Synapse:', error);
			throw error;
		}
	},

	getStorageContext: async () => {
		const synapse = await SynapseSDK.create({
			privateKey: env.SYNAPSE_PRIVATE_KEY,
			rpcURL: RPC_URLS.mainnet.http,
		});
		return await synapse.storage.createContext({
			withCDN: false,
			metadata: {
				Application: 'Halo',
				Version: '1.0.0',
			},
		});
	},

	saveReceiptImage: async (image: Uint8Array<ArrayBufferLike>) => {
		const storageContext = await Synapse.getStorageContext();
		const { pieceCid, size, pieceId } = await storageContext.upload(image);

		return { pieceCid, size, pieceId };
	},

	getImage: async (pieceCid: string) => {
		const storageContext = await Synapse.getStorageContext();
		const image = await storageContext.download(pieceCid);
		return image;
	},
};
