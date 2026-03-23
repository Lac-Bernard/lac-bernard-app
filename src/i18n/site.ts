import type { Language } from '@/utils/i18n';

export type SiteUi = {
	siteNameSuffix: string;
	pageMetaDescriptionFallback: (pageTitle: string) => string;
};

export const siteUi: Record<Language, SiteUi> = {
	en: {
		siteNameSuffix: 'Lac Bernard Association',
		pageMetaDescriptionFallback: (pageTitle) =>
			`Learn more about ${pageTitle} at the Lac Bernard Association.`,
	},
	fr: {
		siteNameSuffix: 'Association du lac Bernard',
		pageMetaDescriptionFallback: (pageTitle) =>
			`En savoir plus sur ${pageTitle} à l'Association du lac Bernard.`,
	},
};
