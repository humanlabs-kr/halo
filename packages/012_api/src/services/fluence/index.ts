export type FluenceOcrResponse = {
	text: string;
	fields: {
		total_amount: string;
		date: string;
		merchant_name: string;
		subtotal: string;
		tax: string;
	};
	success: boolean;
};

export const FluenceOcr = {
	runOcrImage: async (image: Uint8Array<ArrayBufferLike>) => {
		const buffer = Buffer.from(image);
		const base64Image = buffer.toString('base64').replace(/\s/g, '');

		const response = await fetch('http://94.103.168.85:5000/ocr', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ imageUrl: `data:image/jpeg;base64,${base64Image}` }),
		});

		if (!response.ok) {
			throw new Error(`Failed to run OCR: ${response.statusText}`);
		}

		const result = (await response.json()) as FluenceOcrResponse;

		return result;
	},
};
