export type MemberLocale = 'en' | 'fr';

export const memberPaths: Record<
	MemberLocale,
	{ account: string; signIn: string; admin: string; enrollment: string; renewal: string }
> = {
	en: {
		account: '/en/membership/account',
		signIn: '/en/membership/account/sign-in',
		admin: '/en/membership/admin',
		enrollment: '/en/membership/enrollment',
		renewal: '/en/membership/renewal',
	},
	fr: {
		account: '/fr/membership/account',
		signIn: '/fr/membership/account/sign-in',
		admin: '/fr/membership/admin',
		enrollment: '/fr/membership/enrollment',
		renewal: '/fr/membership/renewal',
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
		signOut: string;
		signInTitle: string;
		signInDescription: string;
		signInHeroAria: string;
		signInHero: string;
		signInLead: string;
		signInDivider: string;
		signInWithGoogle: string;
		emailLabel: string;
		emailPlaceholder: string;
		sendMagicLink: string;
		sendingMagicLink: string;
		signInTryAnotherEmail: string;
		errorGeneric: string;
		errorNetwork: string;
		magicLinkFormExplainer: string;
		checkEmail: string;
		adminTitle: string;
		adminDescription: string;
		adminHeroAria: string;
		adminHero: string;
		adminBody: string;
		membershipHistorySection: string;
		membershipTableYear: string;
		membershipTableType: string;
		membershipTableStatus: string;
		membershipStatusActive: string;
		membershipStatusPending: string;
		tierGeneral: string;
		tierAssociate: string;
		noMemberForEmail: string;
		statusActiveTitle: string;
		statusActiveTierLabel: string;
		statusInactiveTitle: string;
		statusInactiveLead: string;
		tierChoiceLegend: string;
		createPendingSubmit: string;
		statusPendingTitle: string;
		statusPendingLead: string;
		cancelPending: string;
		pendingCreateErrorUnauthorized: string;
		pendingCreateErrorAlreadyActive: string;
		pendingCreateErrorAlreadyPending: string;
		pendingCreateErrorGeneric: string;
		pendingCancelErrorGeneric: string;
		pendingCancelErrorNotFound: string;
		payWithCard: string;
		stripeComingSoon: string;
		otherPaymentTitle: string;
		payInteracTitle: string;
		payInteracBeforeLink: string;
		payInteracAfterLink: string;
		interacEmail: string;
		payChequeTitle: string;
		payChequeAddress: string;
		payCashTitle: string;
		payCashBeforeLink: string;
		payCashAfterLink: string;
		membershipEmail: string;
		formsHintBefore: string;
		formsHintAfter: string;
		linkRenewal: string;
		linkEnrollment: string;
		formsHintEnd: string;
		membershipPrepaidSection: string;
		membershipPrepaidLead: string;
	}
> = {
	en: {
		homeTitle: 'Member area | Lac Bernard Association',
		homeDescription: 'See your membership status for this year and how to renew or pay.',
		homeHero: 'Member area',
		signedInAs: 'Signed in as',
		homeIntro:
			'Below is your membership status for {{year}}. This page is only visible when you are signed in.',
		signOut: 'Sign out',
		signInTitle: 'Member sign in | Lac Bernard Association',
		signInDescription: 'Sign in to the Lac Bernard Association member area.',
		signInHeroAria: 'Sign in',
		signInHero: 'Member sign in',
		signInLead: 'Sign in with Google or request a secure link by email.',
		signInDivider: 'or',
		signInWithGoogle: 'Continue with Google',
		emailLabel: 'Email',
		emailPlaceholder: 'you@example.com',
		sendMagicLink: 'Send magic link',
		sendingMagicLink: 'Sending link…',
		signInTryAnotherEmail: 'Use a different email',
		errorGeneric: 'Something went wrong. Please try again.',
		errorNetwork: 'Network error. Please try again.',
		magicLinkFormExplainer:
			'We’ll email a one-time sign-in link to the address you enter. No password needed.',
		checkEmail: 'Check your email for the sign-in link.',
		adminTitle: 'Admin | Lac Bernard Association',
		adminDescription: 'Association administration — members and payments.',
		adminHeroAria: 'Administration',
		adminHero: 'Administration',
		adminBody:
			'Member records, payment marking, and tools will live here. Access is limited to accounts with the admin role in Supabase.',
		membershipHistorySection: 'Membership history',
		membershipTableYear: 'Year',
		membershipTableType: 'Type',
		membershipTableStatus: 'Status',
		membershipStatusActive: 'Active',
		membershipStatusPending: 'Pending payment',
		tierGeneral: 'General',
		tierAssociate: 'Associate',
		noMemberForEmail:
			'We could not find a member profile linked to this sign-in email. If you use another address on file, sign in with that email or contact the association.',
		statusActiveTitle: 'Your {{year}} membership is active',
		statusActiveTierLabel: 'Membership type',
		statusInactiveTitle: 'No active membership for {{year}}',
		statusInactiveLead:
			'Choose general or associate and start a membership request. You’ll see payment instructions next; your membership becomes active once your payment is received or recorded by the association.',
		tierChoiceLegend: 'Membership type',
		createPendingSubmit: 'Start membership request',
		statusPendingTitle: 'Your {{year}} membership is pending payment',
		statusPendingLead:
			'Use one of the options below to pay. Your membership will become active when payment is confirmed (online or by an administrator).',
		cancelPending: 'Cancel request',
		pendingCreateErrorUnauthorized: 'You must be signed in. Refresh the page and try again.',
		pendingCreateErrorAlreadyActive: 'You already have an active membership for this year.',
		pendingCreateErrorAlreadyPending: 'You already have a pending request for this year. Cancel it first if you want to start over.',
		pendingCreateErrorGeneric: 'Could not start your request. Please try again.',
		pendingCancelErrorGeneric: 'Could not cancel. Please try again.',
		pendingCancelErrorNotFound: 'That request could not be found or is no longer pending.',
		payWithCard: 'Pay with credit card',
		stripeComingSoon: 'Secure checkout with Stripe will be available here soon.',
		otherPaymentTitle: 'Other ways to pay',
		payInteracTitle: 'INTERAC e-Transfer',
		payInteracBeforeLink: 'Send your payment from your bank to ',
		payInteracAfterLink: '. The association does not collect banking details.',
		interacEmail: 'interac@lacbernard.ca',
		payChequeTitle: 'Cheque',
		payChequeAddress:
			"The Owners' and Residents' Association of Lac Bernard\nC.P 1262 Succursale C\nGatineau, Quebec J8X 3X7",
		payCashTitle: 'Cash',
		payCashBeforeLink: 'Contact us at ',
		payCashAfterLink: ' to arrange payment in person.',
		membershipEmail: 'membership@lacbernard.ca',
		formsHintBefore: 'Use the ',
		formsHintAfter: ' or ',
		linkRenewal: 'renewal form',
		linkEnrollment: 'new membership form',
		formsHintEnd: ' so we can match your payment to your record.',
		membershipPrepaidSection: 'Prepaid / future years',
		membershipPrepaidLead: 'These membership years are on file after the current calendar year.',
	},
	fr: {
		homeTitle: 'Espace membre | Association du lac Bernard',
		homeDescription: 'Consultez le statut de votre adhésion pour l’année en cours et les options de paiement.',
		homeHero: 'Espace membre',
		signedInAs: 'Connecté en tant que',
		homeIntro:
			'Ci-dessous : le statut de votre adhésion pour {{year}}. Cette page est visible seulement lorsque vous êtes connecté.',
		signOut: 'Se déconnecter',
		signInTitle: 'Connexion membre | Association du lac Bernard',
		signInDescription: 'Connexion à l’espace membre de l’Association du lac Bernard.',
		signInHeroAria: 'Connexion',
		signInHero: 'Connexion membre',
		signInLead: 'Connectez-vous avec Google ou recevez un lien sécurisé par courriel.',
		signInDivider: 'ou',
		signInWithGoogle: 'Continuer avec Google',
		emailLabel: 'Courriel',
		emailPlaceholder: 'vous@exemple.com',
		sendMagicLink: 'Envoyer le lien magique',
		sendingMagicLink: 'Envoi du lien…',
		signInTryAnotherEmail: 'Utiliser une autre adresse',
		errorGeneric: 'Une erreur s’est produite. Veuillez réessayer.',
		errorNetwork: 'Erreur réseau. Veuillez réessayer.',
		magicLinkFormExplainer:
			'Nous enverrons un lien de connexion à usage unique à l’adresse indiquée. Aucun mot de passe requis.',
		checkEmail: 'Vérifiez votre courriel pour le lien de connexion.',
		adminTitle: 'Administration | Association du lac Bernard',
		adminDescription: 'Administration de l’association — membres et paiements.',
		adminHeroAria: 'Administration',
		adminHero: 'Administration',
		adminBody:
			'Les dossiers membres, le suivi des paiements et les outils seront regroupés ici. L’accès est réservé aux comptes dotés du rôle administrateur dans Supabase.',
		membershipHistorySection: 'Historique des adhésions',
		membershipTableYear: 'Année',
		membershipTableType: 'Type',
		membershipTableStatus: 'Statut',
		membershipStatusActive: 'Active',
		membershipStatusPending: 'En attente de paiement',
		tierGeneral: 'Générale',
		tierAssociate: 'Associée',
		noMemberForEmail:
			'Aucun profil membre n’est lié à cette adresse de connexion. Si vous utilisez une autre adresse dans nos dossiers, connectez-vous avec celle-ci ou communiquez avec l’association.',
		statusActiveTitle: 'Votre adhésion {{year}} est active',
		statusActiveTierLabel: 'Type d’adhésion',
		statusInactiveTitle: 'Aucune adhésion active pour {{year}}',
		statusInactiveLead:
			'Choisissez le type d’adhésion (générale ou associée) et démarrez une demande. Les instructions de paiement suivront; votre adhésion deviendra active lorsque le paiement sera reçu ou enregistré par l’association.',
		tierChoiceLegend: 'Type d’adhésion',
		createPendingSubmit: 'Démarrer la demande d’adhésion',
		statusPendingTitle: 'Votre adhésion {{year}} est en attente de paiement',
		statusPendingLead:
			'Utilisez l’une des options ci-dessous pour payer. Votre adhésion deviendra active lorsque le paiement sera confirmé (en ligne ou par un administrateur).',
		cancelPending: 'Annuler la demande',
		pendingCreateErrorUnauthorized: 'Vous devez être connecté. Actualisez la page et réessayez.',
		pendingCreateErrorAlreadyActive: 'Vous avez déjà une adhésion active pour cette année.',
		pendingCreateErrorAlreadyPending: 'Vous avez déjà une demande en attente pour cette année. Annulez-la d’abord si vous voulez recommencer.',
		pendingCreateErrorGeneric: 'Impossible de démarrer la demande. Veuillez réessayer.',
		pendingCancelErrorGeneric: 'Impossible d’annuler. Veuillez réessayer.',
		pendingCancelErrorNotFound: 'Cette demande est introuvable ou n’est plus en attente.',
		payWithCard: 'Payer par carte de crédit',
		stripeComingSoon: 'Un paiement sécurisé par Stripe sera bientôt disponible ici.',
		otherPaymentTitle: 'Autres modes de paiement',
		payInteracTitle: 'Virement Interac',
		payInteracBeforeLink: 'Envoyez votre paiement à partir de votre banque à ',
		payInteracAfterLink: '. L’association ne recueille pas vos données bancaires.',
		interacEmail: 'interac@lacbernard.ca',
		payChequeTitle: 'Chèque',
		payChequeAddress:
			'L’Association des propriétaires et résidents du lac Bernard\nC.P 1262 Succursale C\nGatineau, Québec J8X 3X7',
		payCashTitle: 'Comptant',
		payCashBeforeLink: 'Communiquez avec nous à ',
		payCashAfterLink: ' pour convenir d’un paiement en personne.',
		membershipEmail: 'membership@lacbernard.ca',
		formsHintBefore: 'Utilisez le ',
		formsHintAfter: ' ou le ',
		linkRenewal: 'formulaire de renouvellement',
		linkEnrollment: 'formulaire d’adhésion',
		formsHintEnd: ' afin que nous puissions associer votre paiement à votre dossier.',
		membershipPrepaidSection: 'Années payées d’avance / futures',
		membershipPrepaidLead: 'Ces années d’adhésion sont enregistrées après l’année civile en cours.',
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
