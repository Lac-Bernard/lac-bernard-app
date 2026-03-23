import type { Language } from '@/utils/i18n';

export type MembershipUi = {
	defaultTitle: string;
	heroAriaLabel: string;
};

export const membershipUi: Record<Language, MembershipUi> = {
	en: {
		defaultTitle: 'Membership',
		heroAriaLabel: 'Membership hero',
	},
	fr: {
		defaultTitle: 'Adhésion',
		heroAriaLabel: 'En-tête adhésion',
	},
};
