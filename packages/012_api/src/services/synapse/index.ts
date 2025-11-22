import { SynapseConfig } from './config';

export const Synapse = {
	saveReceipt: async (file: File) => {
		const storageContext = await SynapseConfig.getStorageContext();
		const arrayBuffer = await file.arrayBuffer();
		const inputBytes = new Uint8Array(arrayBuffer);
		const { pieceCid, size, pieceId } = await storageContext.upload(inputBytes);

		return { pieceCid, size, pieceId };
	},
	getImage: async (pieceCid: string) => {
		const storageContext = await SynapseConfig.getStorageContext();
		const image = await storageContext.download(pieceCid);
		return image;
	},
};
