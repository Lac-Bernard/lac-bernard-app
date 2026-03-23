/**
 * Bilingual site: `astro.config` `i18n` matches `src/pages/en|fr/`, blog Markdown in `src/content/blog/en|fr/`.
 * Use `languageFromAstro(Astro)` in layouts so `Astro.currentLocale` is primary; URL parsing is the fallback.
 * Do not pass full pathnames to `astro:i18n`’s `getLocaleByPath` — it expects the locale segment only (e.g. `"en"`).
 */
export const languages = {
	en: 'English',
	fr: 'Français',
} as const;

export type Language = keyof typeof languages;

/** Normalize a single path segment for locale comparison (lowercase, `_` → `-`). */
function normalizeLocaleSegment(segment: string): string {
	return segment.replaceAll('_', '-').toLowerCase();
}

/** French URL paths (legacy) → canonical path under `/fr/` with English slugs */
export const legacyFrenchPathToEnglishPath: Record<string, string> = {
	'/': '/',
	'a-propos': 'about',
	'a-propos/comite-executif': 'about/executive',
	'a-propos/comites': 'about/committees',
	'a-propos/reglements': 'about/bylaws',
	'a-propos/proces-verbaux': 'about/business-records',
	'a-propos/archives': 'about/archive',
	environnement: 'environment',
	'environnement/echantillonnage-eau': 'environment/water-sampling',
	'environnement/myriophylle': 'environment/milfoil',
	'environnement/rivage': 'environment/shoreline',
	'environnement/eau': 'environment/water',
	'environnement/navigation': 'environment/boating',
	'environnement/navigation/securite-navigation-sports-nautiques': 'environment/boating',
	'environnement/faune': 'environment/wildlife',
	communaute: 'community',
	'communaute/regate': 'community/regatta',
	'communaute/securite': 'community/security',
	'communaute/securite/police': 'community/security/police',
	'communaute/securite/contacts-urgence': 'community/security/emergency-contacts',
	'communaute/securite/incendie': 'community/security/fire',
	'communaute/securite/surveillance-quartier': 'community/security/neighbourhood-watch',
	histoire: 'history',
	'histoire/premieres-nations': 'history/first-nations',
	'histoire/club-de-peche': 'history/fishing-club',
	'histoire/cartes': 'history/maps',
	'histoire/photos-aeriennes': 'history/aerial-photos',
	'histoire/recits-familles-et-individus': 'history/stories-documenting-families-and-individuals',
	'histoire/recits-histoire-du-lac': 'history/stories-documenting-history-of-the-lake',
	'histoire/collection-coupures-de-journaux-lac-bernard':
		'history/newspaper-clippings-collection-of-lac-bernard',
	'histoire/recherche-historique-et-sources': 'history/historical-research-and-sources',
	'histoire/proprietes-et-titres': 'history/properties-and-deeds',
	'histoire/histoire-connexe': 'history/related-history',
	adhesion: 'membership',
	'adhesion/enrollment': 'membership/enrollment',
	'adhesion/renewal': 'membership/renewal',
	contact: 'contact',
	news: 'news',
};

/**
 * Old site used French slugs at the host root (e.g. `/environnement/eau`). Maps to canonical `/fr/...`
 * with English slugs. Returns `null` if the path is not a legacy French URL or is already under `/en/` or `/fr/`.
 */
export function getLegacyFrenchRedirect(pathname: string): string | null {
	const p = pathname.startsWith('/') ? pathname : `/${pathname}`;
	if (p.startsWith('/en/') || p.startsWith('/fr/') || p === '/en' || p === '/fr') {
		return null;
	}
	if (p.startsWith('/_') || p.startsWith('/api') || p.startsWith('/admin')) {
		return null;
	}
	const stripped = p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p;
	const lookupKey = stripped === '/' ? '/' : stripped.slice(1);
	if (!Object.prototype.hasOwnProperty.call(legacyFrenchPathToEnglishPath, lookupKey)) {
		return null;
	}
	const mapped = legacyFrenchPathToEnglishPath[lookupKey as keyof typeof legacyFrenchPathToEnglishPath];
	if (mapped === '/') {
		return '/fr/';
	}
	return `/fr/${mapped}`;
}

function stripTrailingSlash(p: string): string {
	if (p.length > 1 && p.endsWith('/')) return p.slice(0, -1);
	return p;
}

/**
 * Path without locale prefix, using English slugs (e.g. `/about`, `/news/foo`).
 */
export function getEnglishPathFromPathname(pathname: string): string {
	let p = pathname.startsWith('/') ? pathname : `/${pathname}`;
	p = stripTrailingSlash(p);
	const withoutLocale = p.replace(/^\/(en|fr)(\/|$)/, '/');
	const normalized = withoutLocale === '' ? '/' : withoutLocale;
	if (normalized === '/') return '/';

	const noLeading = normalized.replace(/^\//, '');
	const segments = noLeading.split('/').filter(Boolean);

	if (segments[0] === 'news' && segments.length >= 2) {
		return `/${segments.join('/')}`;
	}
	if (segments[0] === 'news') {
		return '/news';
	}

	if (
		segments[0] === 'environnement' &&
		segments[1] === 'echantillonnage-eau' &&
		segments.length === 3 &&
		/^\d{4}$/.test(segments[2])
	) {
		return `/environment/water-sampling/${segments[2]}`;
	}

	const legacyKey = segments.join('/');
	const mapped = legacyFrenchPathToEnglishPath[legacyKey];
	if (mapped) {
		return mapped === '' ? '/' : `/${mapped}`;
	}

	// Already English-slug paths under no locale (legacy) or after /fr|/en
	return normalized;
}

function normalizePathSegment(segment: string): string {
	return segment.endsWith('.html') ? segment.slice(0, -5) : segment;
}

/** First URL segment when it is `en` or `fr` (prefix routing); default French. */
export function getLanguageFromPath(pathname: string): Language {
	const segments = pathname
		.split('/')
		.map(normalizePathSegment)
		.filter(Boolean);
	if (segments.length === 0) return 'fr';

	const n = normalizeLocaleSegment(segments[0]);
	if (n === normalizeLocaleSegment('en')) return 'en';
	if (n === normalizeLocaleSegment('fr')) return 'fr';
	return 'fr';
}

type AstroLocaleContext = { currentLocale?: string | undefined; url: { pathname: string } };

/** Prefer `Astro.currentLocale` from built-in i18n; fall back to pathname if unset. */
export function languageFromAstro(astro: AstroLocaleContext): Language {
	const c = astro.currentLocale;
	if (c === 'en' || c === 'fr') return c;
	return getLanguageFromPath(astro.url.pathname);
}

export function getAlternateLanguage(currentLang: Language): Language {
	return currentLang === 'en' ? 'fr' : 'en';
}

export function getLocalizedPath(pathname: string, lang: Language): string {
	const englishPath = getEnglishPathFromPathname(pathname);
	if (englishPath === '/') {
		return `/${lang}`;
	}
	return `/${lang}${englishPath}`;
}

export function getLocalizedHref(href: string, currentLang: Language): string {
	if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#')) {
		return href;
	}
	return getLocalizedPath(href, currentLang);
}
