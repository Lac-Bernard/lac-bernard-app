// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://example.com',
	output: 'server',
	adapter: vercel(),
	integrations: [mdx(), sitemap()],
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'fr'],
		routing: {
			prefixDefaultLocale: false,
		},
	},
});
