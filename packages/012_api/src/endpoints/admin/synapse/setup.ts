import { contentJson, OpenAPIRoute } from 'chanfana';
import { SynapseConfig } from 'workers/services/synapse/config';
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
		if (!c.req.header('Authorization')?.includes('IAMADMIN')) {
			return c.json(
				{
					code: 'UNAUTHORIZED',
					message: 'Unauthorized',
				},
				401,
			);
		}

		const { amount } = data.body;

		await SynapseConfig.setup(amount);

		return c.json({
			success: true,
		});
	}
}
