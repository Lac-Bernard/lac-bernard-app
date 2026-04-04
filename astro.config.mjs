// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://lacbernard.ca',
	// Prerender by default; `export const prerender = false` on routes that need cookies/SSR/API.
	output: 'static',
	adapter: vercel(),
	integrations: [mdx(), sitemap()],
	i18n: {
		defaultLocale: 'fr',
		locales: ['fr', 'en'],
		routing: {
			prefixDefaultLocale: true,
		},
	},
});
