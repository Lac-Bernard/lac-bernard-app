import type { Language } from '@/utils/i18n';

export type NewsIndexUi = {
	pageTitleSegment: string;
	metaDescription: string;
	heading: string;
	intro: string;
};

export const newsIndexUi: Record<Language, NewsIndexUi> = {
	en: {
		pageTitleSegment: 'News',
		metaDescription: 'Latest news and updates from the Lac Bernard Association',
		heading: 'Latest News',
		intro: 'Stay up to date with the latest news and updates from the Lac Bernard Association.',
	},
	fr: {
		pageTitleSegment: 'Nouvelles',
		metaDescription: "Dernières nouvelles et mises à jour de l'Association du lac Bernard",
		heading: 'Dernières nouvelles',
		intro: "Restez informé des dernières nouvelles et mises à jour de l'Association du lac Bernard.",
	},
};
