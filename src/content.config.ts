import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// `src/content/blog/en/*.md` and `src/content/blog/fr/*.md` — id is `en/<slug>` or `fr/<slug>`.
	loader: glob({ base: './src/content/blog', pattern: '{en,fr}/**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
		}),
});

const pages = defineCollection({
	// Load Markdown and MDX files under `content/pages/en/` and `content/pages/fr/`.
	loader: glob({ base: './content/pages', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
	}),
});

export const collections = { blog, pages };
