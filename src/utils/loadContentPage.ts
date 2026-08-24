import type { Language } from './i18n';

/** Markdown module shape produced by `import.meta.glob` for `.md` files. */
export type ContentMarkdownModule = {
	frontmatter?: { title?: string; description?: string; [key: string]: unknown };
	Content?: import('astro').MarkdownInstance<Record<string, unknown>>['Content'];
};

const loaders = import.meta.glob<() => Promise<ContentMarkdownModule>>('../../content/pages/*/**/*.md');

/**
 * Load `content/pages/{lang}/{basename}.md`, falling back to `content/pages/{lang}/{basename}/index.md`
 * for basenames that have child pages. The `lang` folder must match the file you want; it may differ
 * from the URL locale when a page intentionally reuses another locale’s markdown.
 */
export async function loadContentPage(lang: Language, basename: string): Promise<ContentMarkdownModule> {
	const flatKey = `../../content/pages/${lang}/${basename}.md`;
	const indexKey = `../../content/pages/${lang}/${basename}/index.md`;
	const load = loaders[flatKey] ?? loaders[indexKey];
	if (!load) {
		throw new Error(`Missing content page: content/pages/${lang}/${basename}.md (or ${basename}/index.md)`);
	}
	return load();
}
