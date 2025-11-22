import { RPC_URLS, Synapse, TIME_CONSTANTS } from '@filoz/synapse-sdk';
import { env } from 'cloudflare:workers';
import { ethers } from 'ethers';

export const SynapseConfig = {
	setup: async (amount: string) => {
		// 1) Initialize the Synapse SDK
		try {
			const synapse = await Synapse.create({
				privateKey: env.SYNAPSE_PRIVATE_KEY,
				rpcURL: RPC_URLS.mainnet.http,
			});

			// 2) Fund & approve (single tx)
			const depositAmount = ethers.parseUnits(amount, 18);
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
		const synapse = await Synapse.create({
			privateKey: env.SYNAPSE_PRIVATE_KEY,
			rpcURL: RPC_URLS.mainnet.http,
		});

		return await synapse.storage.createContext({
			withCDN: false,
			metadata: {
				Application: 'Receipto',
				Version: '1.0.0',
			},
			// callbacks: {
			// 	onDataSetResolved: (info) => {
			// 		if (info.isExisting) {
			// 			console.log(`Data set with id ${info.dataSetId}`, `matches your context criteria and will be reused`);
			// 		} else {
			// 			console.log(`No matching data set found`, `A new data set will be created in the next file upload`, `In a single transaction!`);
			// 		}
			// 	},
			// 	onProviderSelected: (provider) => {
			// 		console.log(
			// 			`Selected Provider with \n`,
			// 			` id: ${provider.id} \n`,
			// 			` name: ${provider.name} \n`,
			// 			` description: ${provider.description} \n`,
			// 			` address: ${provider.serviceProvider} \n`,
			// 			` products: ${JSON.stringify(provider.products, (key, value) => (typeof value === 'bigint' ? value.toString() + 'n' : value), 2)}`,
			// 		);
			// 	},
			// },
		});
	},
};
