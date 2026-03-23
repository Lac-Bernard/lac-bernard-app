import type { Language } from './i18n';

/**
 * Blog entries live under `src/content/blog/{en,fr}/<slug>.md`.
 * Collection `id` is `en/<slug>` or `fr/<slug>` (path relative to blog root, no extension).
 */
export function blogPostSlug(collectionId: string): string {
	const i = collectionId.indexOf('/');
	if (i === -1) return collectionId;
	return collectionId.slice(i + 1);
}

export function blogCollectionId(lang: Language, slug: string): string {
	return `${lang}/${slug}`;
}

export function isBlogPostInLocale(collectionId: string, lang: Language): boolean {
	return collectionId.startsWith(`${lang}/`);
}
