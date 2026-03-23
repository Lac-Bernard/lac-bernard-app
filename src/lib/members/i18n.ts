export type MemberLocale = 'en' | 'fr';

export const memberPaths: Record<MemberLocale, { account: string; signIn: string; admin: string }> = {
	en: {
		account: '/en/membership/account',
		signIn: '/en/membership/account/sign-in',
		admin: '/en/membership/admin',
	},
	fr: {
		account: '/fr/membership/account',
		signIn: '/fr/membership/account/sign-in',
		admin: '/fr/membership/admin',
	},
};

/** Matches `astro.config` defaultLocale — used when auth APIs have no locale context. */
export const defaultMemberAccountPath = memberPaths.fr.account;
export const defaultMemberSignInPath = memberPaths.fr.signIn;

export const memberCopy: Record<
	MemberLocale,
	{
		homeTitle: string;
		homeDescription: string;
		homeHero: string;
		signedInAs: string;
		homeIntro: string;
		homePlaceholder: string;
		signOut: string;
		signInTitle: string;
		signInDescription: string;
		signInHeroAria: string;
		signInHero: string;
		signInLead: string;
		emailLabel: string;
		emailPlaceholder: string;
		sendMagicLink: string;
		errorGeneric: string;
		errorNetwork: string;
		checkEmail: string;
		adminTitle: string;
		adminDescription: string;
		adminHeroAria: string;
		adminHero: string;
		adminBody: string;
		membershipActiveSection: string;
		membershipHistorySection: string;
		membershipTableYear: string;
		membershipTableType: string;
		tierGeneral: string;
		tierAssociate: string;
		noMemberForEmail: string;
		noMembershipsRecorded: string;
		noMembershipThisYear: string;
	}
> = {
	en: {
		homeTitle: 'Member area | Lac Bernard Association',
		homeDescription: 'View your memberships and update your information.',
		homeHero: 'Member area',
		signedInAs: 'Signed in as',
		homeIntro:
			'Your memberships and profile editing will appear here. This page is only visible when you are signed in.',
		homePlaceholder: 'Memberships and profile editing will be added here.',
		signOut: 'Sign out',
		signInTitle: 'Member sign in | Lac Bernard Association',
		signInDescription: 'Sign in to the Lac Bernard Association member area.',
		signInHeroAria: 'Sign in',
		signInHero: 'Member sign in',
		signInLead: 'We’ll email you a secure link to access your member area.',
		emailLabel: 'Email',
		emailPlaceholder: 'you@example.com',
		sendMagicLink: 'Send magic link',
		errorGeneric: 'Something went wrong. Please try again.',
		errorNetwork: 'Network error. Please try again.',
		checkEmail: 'Check your email for the sign-in link.',
		adminTitle: 'Admin | Lac Bernard Association',
		adminDescription: 'Association administration — members and payments.',
		adminHeroAria: 'Administration',
		adminHero: 'Administration',
		adminBody:
			'Member records, payment marking, and tools will live here. Access is limited to accounts with the admin role in Supabase.',
		membershipActiveSection: 'Current membership',
		membershipHistorySection: 'Membership history',
		membershipTableYear: 'Year',
		membershipTableType: 'Type',
		tierGeneral: 'General',
		tierAssociate: 'Associate',
		noMemberForEmail:
			'We could not find a member profile linked to this sign-in email. If you use another address on file, sign in with that email or contact the association.',
		noMembershipsRecorded: 'No membership years are on file yet.',
		noMembershipThisYear: 'No membership is recorded for {{year}} yet.',
	},
	fr: {
		homeTitle: 'Espace membre | Association du lac Bernard',
		homeDescription: 'Consultez vos adhésions et mettez à jour vos informations.',
		homeHero: 'Espace membre',
		signedInAs: 'Connecté en tant que',
		homeIntro:
			'Vos adhésions et la modification du profil apparaîtront ici. Cette page est visible seulement lorsque vous êtes connecté.',
		homePlaceholder: 'Les adhésions et le profil seront ajoutés ici.',
		signOut: 'Se déconnecter',
		signInTitle: 'Connexion membre | Association du lac Bernard',
		signInDescription: 'Connexion à l’espace membre de l’Association du lac Bernard.',
		signInHeroAria: 'Connexion',
		signInHero: 'Connexion membre',
		signInLead: 'Nous vous enverrons un lien sécurisé par courriel pour accéder à votre espace membre.',
		emailLabel: 'Courriel',
		emailPlaceholder: 'vous@exemple.com',
		sendMagicLink: 'Envoyer le lien magique',
		errorGeneric: 'Une erreur s’est produite. Veuillez réessayer.',
		errorNetwork: 'Erreur réseau. Veuillez réessayer.',
		checkEmail: 'Vérifiez votre courriel pour le lien de connexion.',
		adminTitle: 'Administration | Association du lac Bernard',
		adminDescription: 'Administration de l’association — membres et paiements.',
		adminHeroAria: 'Administration',
		adminHero: 'Administration',
		adminBody:
			'Les dossiers membres, le suivi des paiements et les outils seront regroupés ici. L’accès est réservé aux comptes dotés du rôle administrateur dans Supabase.',
		membershipActiveSection: 'Adhésion en cours',
		membershipHistorySection: 'Historique des adhésions',
		membershipTableYear: 'Année',
		membershipTableType: 'Type',
		tierGeneral: 'Générale',
		tierAssociate: 'Associée',
		noMemberForEmail:
			'Aucun profil membre n’est lié à cette adresse de connexion. Si vous utilisez une autre adresse dans nos dossiers, connectez-vous avec celle-ci ou communiquez avec l’association.',
		noMembershipsRecorded: 'Aucune adhésion n’est encore enregistrée.',
		noMembershipThisYear: 'Aucune adhésion n’est enregistrée pour {{year}} pour le moment.',
	},
};

export function membershipTierLabel(tier: string, locale: MemberLocale): string {
	const t = memberCopy[locale];
	if (tier === 'general') return t.tierGeneral;
	if (tier === 'associate') return t.tierAssociate;
	return tier;
}

export function safeMemberNext(path: string | null, locale: MemberLocale): string {
	const fallback = memberPaths[locale].account;
	if (!path) return fallback;
	return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}
