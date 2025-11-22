// OpenAPI 보안 스키마
export const securitySchemes = {
	cookieAuth: {
		type: 'apiKey',
		in: 'cookie',
		name: '_hp_access',
		description: 'Access token for authentication',
	},
	bearerAuth: {
		type: 'apiKey',
		in: 'header',
		name: 'Authorization',
		description: "Bearer token for authentication (use token with 'Bearer ' prefix)",
	},
} as const;
