import type { Language } from './i18n';

/** Markdown module shape produced by `import.meta.glob` for `.md` files. */
export type ContentMarkdownModule = {
	frontmatter?: { title?: string; description?: string; [key: string]: unknown };
	Content?: import('astro').MarkdownInstance<Record<string, unknown>>['Content'];
};

const loaders = import.meta.glob<() => Promise<ContentMarkdownModule>>('../../content/pages/*/*.md');

/**
 * Load `content/pages/{lang}/{basename}.md`. The `lang` folder must match the file you want;
 * it may differ from the URL locale when a page intentionally reuses another locale’s markdown.
 */
export async function loadContentPage(lang: Language, basename: string): Promise<ContentMarkdownModule> {
	const key = `../../content/pages/${lang}/${basename}.md`;
	const load = loaders[key];
	if (!load) {
		throw new Error(`Missing content page: content/pages/${lang}/${basename}.md`);
	}
	return load();
}
