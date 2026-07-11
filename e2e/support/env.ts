function required(name: string): string {
	const value = process.env[name];
	if (!value || !value.trim()) {
		throw new Error(
			`E2E tests need ${name} in the environment. Run against local Supabase (\`supabase start\`) ` +
				`and copy the values from \`supabase status\` / your \`.env\` into the shell before running \`npm run test:e2e\`.`,
		);
	}
	return value.trim();
}

export function e2eEnv() {
	return {
		supabaseUrl: required('SUPABASE_URL'),
		supabaseAnonKey: required('SUPABASE_ANON_KEY'),
		supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
		stripeSecretKey: required('STRIPE_SECRET_KEY'),
		stripeWebhookSecret: required('STRIPE_WEBHOOK_SECRET'),
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321',
	};
}
