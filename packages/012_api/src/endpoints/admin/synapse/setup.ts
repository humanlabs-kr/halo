import { contentJson, OpenAPIRoute } from 'chanfana';
import { Synapse } from 'workers/services/synapse';
import { AppContext } from 'workers/types';
import z from 'zod';

export class AdminSynapseSetup extends OpenAPIRoute {
	schema = {
		tags: ['Admin'],
		summary: 'Setup Synapse',
		security: [{ cookie: [] }],
		request: {
			body: contentJson(
				z.object({
					amount: z.string().default('2.5'),
				}),
			),
		},
		responses: {
			'200': {
				description: 'Successfully setup Synapse',
				...contentJson({
					success: z.literal(true),
				}),
			},
		},
	};

	async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();

		const { amount } = data.body;

		await Synapse.setup(amount);

		return c.json({
			success: true,
		});
	}
}
