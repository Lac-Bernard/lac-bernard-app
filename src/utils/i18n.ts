import { getLocaleByPath, pathHasLocale } from 'astro:i18n';

export const languages = {
	en: 'English',
	fr: 'Français',
} as const;

export type Language = keyof typeof languages;

// Slug mapping: English -> French
const slugMap: Record<string, string> = {
	// Main pages
	'about': 'a-propos',
	'environment': 'environnement',
	'community': 'communaute',
	'history': 'histoire',
	'membership': 'adhesion',
	'contact': 'contact',
	
	// About sub-pages
	'about/executive': 'a-propos/comite-executif',
	'about/committees': 'a-propos/comites',
	'about/bylaws': 'a-propos/reglements',
	'about/business-records': 'a-propos/proces-verbaux',
	'about/archive': 'a-propos/archives',
	
	// Environment sub-pages
	'environment/water-sampling': 'environnement/echantillonnage-eau',
	'environment/milfoil': 'environnement/myriophylle',
	'environment/shoreline': 'environnement/rivage',
	'environment/water': 'environnement/eau',
	'environment/boating': 'environnement/navigation',
	'environment/wildlife': 'environnement/faune',
	
	// Community sub-pages
	'community/regatta': 'communaute/regate',
	'community/security': 'communaute/securite',
	'community/security/police': 'communaute/securite/police',
	'community/security/emergency-contacts': 'communaute/securite/contacts-urgence',
	'community/security/fire': 'communaute/securite/incendie',
	'community/security/neighbourhood-watch': 'communaute/securite/surveillance-quartier',
	
	// History sub-pages
	'history/first-nations': 'histoire/premieres-nations',
	'history/fishing-club': 'histoire/club-de-peche',
	'history/maps': 'histoire/cartes',
	'history/aerial-photos': 'histoire/photos-aeriennes',
	'history/stories-documenting-families-and-individuals': 'histoire/recits-familles-et-individus',
	'history/stories-documenting-history-of-the-lake': 'histoire/recits-histoire-du-lac',
	'history/newspaper-clippings-collection-of-lac-bernard': 'histoire/collection-coupures-de-journaux-lac-bernard',
	'history/historical-research-and-sources': 'histoire/recherche-historique-et-sources',
	'history/properties-and-deeds': 'histoire/proprietes-et-titres',
	'history/related-history': 'histoire/histoire-connexe',
};

// Reverse mapping: French -> English
const reverseSlugMap: Record<string, string> = Object.fromEntries(
	Object.entries(slugMap).map(([en, fr]) => [fr, en])
);

/**
 * Translate a path segment from English to French or vice versa
 */
function translateSlug(pathSegment: string, fromLang: Language, toLang: Language): string {
	if (fromLang === toLang) return pathSegment;
	
	if (fromLang === 'en' && toLang === 'fr') {
		return slugMap[pathSegment] || pathSegment;
	} else if (fromLang === 'fr' && toLang === 'en') {
		return reverseSlugMap[pathSegment] || pathSegment;
	}
	
	return pathSegment;
}

/**
 * Translate a full path (without locale prefix) between languages
 */
function translatePath(pathWithoutLocale: string, fromLang: Language, toLang: Language): string {
	if (fromLang === toLang) return pathWithoutLocale;
	if (pathWithoutLocale === '/') return '/';
	
	// Remove leading and trailing slashes for processing
	const cleanPath = pathWithoutLocale.replace(/^\/+|\/+$/g, '');
	
	// News/blog posts use the same slug in both languages, so no translation needed
	// The language is determined by the URL path (/en/ or not)
	if (cleanPath.startsWith('news/')) {
		// Just return the path as-is (language is determined by URL prefix)
		return pathWithoutLocale;
	}
	
	// Try to translate the full path first (for nested paths)
	if (fromLang === 'en' && toLang === 'fr') {
		const translated = slugMap[cleanPath];
		if (translated) return '/' + translated;
	} else if (fromLang === 'fr' && toLang === 'en') {
		const translated = reverseSlugMap[cleanPath];
		if (translated) return '/' + translated;
	}
	
	// If no full path match, translate segment by segment
	const segments = cleanPath.split('/');
	const translatedSegments: string[] = [];
	
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		const pathSoFar = segments.slice(0, i + 1).join('/');
		
		// Try to translate the path up to this point
		let translated: string | undefined;
		if (fromLang === 'en' && toLang === 'fr') {
			translated = slugMap[pathSoFar];
		} else if (fromLang === 'fr' && toLang === 'en') {
			translated = reverseSlugMap[pathSoFar];
		}
		
		if (translated) {
			// Use the last segment of the translated path
			translatedSegments.push(translated.split('/').pop() || segment);
		} else {
			// Try translating just this segment
			const segmentTranslated = translateSlug(segment, fromLang, toLang);
			translatedSegments.push(segmentTranslated);
		}
	}
	
	return '/' + translatedSegments.join('/');
}

export function getLanguageFromPath(pathname: string): Language {
	if (pathHasLocale(pathname)) {
		const locale = getLocaleByPath(pathname);
		return (locale || 'fr') as Language;
	}
	// If no locale in path, it's the default locale (fr)
	return 'fr';
}

export function getAlternateLanguage(currentLang: Language): Language {
	return currentLang === 'en' ? 'fr' : 'en';
}

export function getLocalizedPath(pathname: string, lang: Language): string {
	// Normalize path - ensure it starts with /
	let normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
	
	// Detect the source language from the path
	let sourceLang: Language = 'fr';
	let pathWithoutLocale = normalizedPath;
	
	// Check if path has a locale prefix
	if (normalizedPath.startsWith('/en/') || normalizedPath === '/en') {
		sourceLang = 'en';
		pathWithoutLocale = normalizedPath.replace(/^\/en(\/|$)/, '/');
	} else if (normalizedPath.startsWith('/fr/') || normalizedPath === '/fr') {
		sourceLang = 'fr';
		pathWithoutLocale = normalizedPath.replace(/^\/fr(\/|$)/, '/');
	}
	
	// Normalize: remove double slashes and ensure it starts with /
	pathWithoutLocale = pathWithoutLocale.replace(/\/+/g, '/');
	if (pathWithoutLocale !== '/' && !pathWithoutLocale.startsWith('/')) {
		pathWithoutLocale = `/${pathWithoutLocale}`;
	}
	
	// If no locale prefix was detected, try to detect the language from the slug itself
	if (sourceLang === 'fr' && pathWithoutLocale !== '/') {
		const cleanPath = pathWithoutLocale.replace(/^\//, '');
		// Check if this is an English slug (exists in slug map)
		// Try full path first, then check if any segment is English
		if (slugMap[cleanPath]) {
			sourceLang = 'en';
		} else {
			// Check if the first segment is an English slug
			const firstSegment = cleanPath.split('/')[0];
			if (slugMap[firstSegment]) {
				sourceLang = 'en';
			}
		}
	}
	
	// Translate the path if switching languages
	if (sourceLang !== lang && pathWithoutLocale !== '/') {
		pathWithoutLocale = translatePath(pathWithoutLocale, sourceLang, lang);
	}
	
	// If default locale (fr) and prefixDefaultLocale is false, return path as-is
	if (lang === 'fr') {
		return pathWithoutLocale;
	}
	
	// For non-default locale, add prefix
	// Handle root path specially - return /en instead of /en/
	if (pathWithoutLocale === '/') {
		return `/${lang}`;
	}
	return `/${lang}${pathWithoutLocale}`;
}

export function getLocalizedHref(href: string, currentLang: Language): string {
	// Handle absolute URLs
	if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('#')) {
		return href;
	}
	
	return getLocalizedPath(href, currentLang);
}
