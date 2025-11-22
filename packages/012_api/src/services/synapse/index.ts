import { SynapseConfig } from './config';

export const Synapse = {
	saveReceiptImage: async (image: Uint8Array<ArrayBufferLike>) => {
		const storageContext = await SynapseConfig.getStorageContext();
		const { pieceCid, size, pieceId } = await storageContext.upload(image);

		return { pieceCid, size, pieceId };
	},
	getImage: async (pieceCid: string) => {
		const storageContext = await SynapseConfig.getStorageContext();
		const image = await storageContext.download(pieceCid);
		return image;
	},
};
