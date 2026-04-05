import type { Language } from '@/utils/i18n';

export type MembershipUi = {
	defaultTitle: string;
	heroAriaLabel: string;
	/** One line under the title (body copy carries the linked “member area” phrase) */
	heroAccountIntro: string;
	heroAccountCta: string;
};

export const membershipUi: Record<Language, MembershipUi> = {
	en: {
		defaultTitle: 'Membership',
		heroAriaLabel: 'Membership hero',
		heroAccountIntro: 'Renew, pay, and update your details in the online member area.',
		heroAccountCta: 'Go to your member account',
	},
	fr: {
		defaultTitle: 'Adhésion',
		heroAriaLabel: 'En-tête adhésion',
		heroAccountIntro:
			'Renouvelez, payez et mettez à jour vos renseignements dans l’espace membre en ligne.',
		heroAccountCta: 'Accéder à votre compte membre',
	},
};
