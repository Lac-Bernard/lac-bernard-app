import type { Language } from '@/utils/i18n';

export type HomeUi = {
	siteTitle: string;
	metaDescription: string;
	heroAriaLabel: string;
	defaultHeroTitle: string;
	impact: string;
	years: string;
	members: string;
	events: string;
	volunteerRun: string;
	landAck: string;
	landAckText: string;
	latestNews: string;
	readMore: string;
};

export const homeUi: Record<Language, HomeUi> = {
	en: {
		siteTitle: 'Lac Bernard Association',
		metaDescription:
			'Join the Lac Bernard Association - a volunteer-run organization dedicated to protecting our lake, building community, and promoting safety since 1979.',
		heroAriaLabel: 'Homepage hero',
		defaultHeroTitle: 'Welcome to the Lac Bernard Association',
		impact: 'Our Impact',
		years: 'Years of Service',
		members: 'Active Members',
		events: 'Annual Events',
		volunteerRun: 'Volunteer Run',
		landAck: 'Land Acknowledgment',
		landAckText:
			'The Association would like to acknowledge that the land on which we gather is the traditional unceded territory of the Anishinaabeg People.',
		latestNews: 'Latest News',
		readMore: 'Read more',
	},
	fr: {
		siteTitle: 'Association du lac Bernard',
		metaDescription:
			"Rejoignez l'Association du lac Bernard - une organisation gérée par des bénévoles dédiée à la protection de notre lac, à la construction de la communauté et à la promotion de la sécurité depuis 1979.",
		heroAriaLabel: 'Accueil',
		defaultHeroTitle: "Bienvenue à l'Association du lac Bernard",
		impact: 'Notre impact',
		years: 'Années de service',
		members: 'Membres actifs',
		events: 'Événements annuels',
		volunteerRun: 'Géré par des bénévoles',
		landAck: 'Reconnaissance du territoire',
		landAckText:
			"L'Association souhaite reconnaître que le territoire sur lequel nous nous rassemblons est le territoire traditionnel non cédé du peuple Anishinaabeg.",
		latestNews: 'Dernières nouvelles',
		readMore: 'Lire la suite',
	},
};
