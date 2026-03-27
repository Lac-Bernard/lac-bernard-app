export type MemberLocale = 'en' | 'fr';

export const memberPaths: Record<
	MemberLocale,
	{
		account: string;
		signIn: string;
		admin: string;
		enrollment: string;
		renewal: string;
		join: string;
		edit: string;
	}
> = {
	en: {
		account: '/en/membership/account',
		signIn: '/en/membership/account/sign-in',
		admin: '/en/membership/admin',
		enrollment: '/en/membership/enrollment',
		renewal: '/en/membership/renewal',
		join: '/en/membership/account/new',
		edit: '/en/membership/account/edit',
	},
	fr: {
		account: '/fr/membership/account',
		signIn: '/fr/membership/account/sign-in',
		admin: '/fr/membership/admin',
		enrollment: '/fr/membership/enrollment',
		renewal: '/fr/membership/renewal',
		join: '/fr/membership/account/new',
		edit: '/fr/membership/account/edit',
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
		adminNavPending: string;
		adminNavActiveMembers: string;
		adminNavNotRenewed: string;
		adminTableName: string;
		adminTableEmail: string;
		adminTableYear: string;
		adminTableTier: string;
		adminTableStatus: string;
		adminTableCreated: string;
		adminTableActions: string;
		adminSearchLabel: string;
		adminSortLabel: string;
		adminSortCreatedDesc: string;
		adminSortNameAsc: string;
		adminPendingEmpty: string;
		adminRecordPaymentBtn: string;
		adminPaymentHeading: string;
		adminAmountLabel: string;
		adminMethodLabel: string;
		adminMethodEtransfer: string;
		adminMethodCheque: string;
		adminMethodCash: string;
		adminMethodUnknown: string;
		adminDateLabel: string;
		adminNotesLabel: string;
		adminSubmitPaymentBtn: string;
		adminPromoteBtn: string;
		adminPromoteSuccess: string;
		adminPromoteNoAccount: string;
		adminMemberEditHeading: string;
		adminSaveMemberBtn: string;
		adminDetailHint: string;
		adminLoading: string;
		adminErrorGeneric: string;
		adminPageOf: string;
		adminPrevPage: string;
		adminNextPage: string;
		adminFilterApply: string;
		adminSelectMemberHint: string;
		adminSecondaryEmailLabel: string;
		adminNotesFieldLabel: string;
		adminStatusMemberLabel: string;
		adminUserIdLabel: string;
		adminPrimaryEmailLabel: string;
		adminBackToList: string;
		adminMemberSaved: string;
		adminPaymentSaved: string;
		adminMembershipYearLabel: string;
		adminFilterTierLabel: string;
		adminFilterTierAll: string;
		adminFilterTierGeneral: string;
		adminFilterTierAssociate: string;
		adminExportEmails: string;
		adminExportEmailsCopied: string;
		adminCopyEmailsFallbackPrompt: string;
		adminCopyEmailsDialogCopy: string;
		adminCopyEmailsDialogClose: string;
		adminExportEmailsHint: string;
		adminExportEmailsEmpty: string;
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
		donationLabel: string;
		donationHint: string;
		checkoutErrorGeneric: string;
		checkoutStripeMisconfigured: string;
		checkoutInvalidDonation: string;
		checkoutSuccessBanner: string;
		checkoutCancelledBanner: string;
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
		linkEditProfile: string;
		linkCreateProfile: string;
		profileJoinTitle: string;
		profileJoinDescription: string;
		profileJoinHeroAria: string;
		profileJoinHero: string;
		profileJoinIntro: string;
		profileEditTitle: string;
		profileEditDescription: string;
		profileEditHeroAria: string;
		profileEditHero: string;
		profileSectionContact: string;
		profileSectionLake: string;
		profileSectionMailing: string;
		profileSignInEmail: string;
		profileFirstName: string;
		profileLastName: string;
		profilePrimaryPhone: string;
		profileSecondaryPhone: string;
		profileLakePhone: string;
		profileLakeCivic: string;
		profileLakeStreet: string;
		profileStreetAddress: string;
		profileCity: string;
		profileProvince: string;
		profileCountry: string;
		profilePostal: string;
		profileEmailOptIn: string;
		profileCreateSubmit: string;
		profileSaveSubmit: string;
		profileBackToAccount: string;
		profileErrorLastName: string;
		profileErrorAlreadyMember: string;
		profileErrorSave: string;
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
			'Review pending payments, list active or not-yet-renewed members by year, record manual payments, and grant admin access to linked accounts.',
		adminNavPending: 'Pending payments',
		adminNavActiveMembers: 'Active members',
		adminNavNotRenewed: 'Not renewed',
		adminTableName: 'Name',
		adminTableEmail: 'Email',
		adminTableYear: 'Year',
		adminTableTier: 'Type',
		adminTableStatus: 'Status',
		adminTableCreated: 'Created',
		adminTableActions: 'Actions',
		adminSearchLabel: 'Search',
		adminSortLabel: 'Sort',
		adminSortCreatedDesc: 'Newest first',
		adminSortNameAsc: 'Last name A–Z',
		adminPendingEmpty: 'No pending memberships.',
		adminRecordPaymentBtn: 'Record payment',
		adminPaymentHeading: 'Record manual payment',
		adminAmountLabel: 'Amount',
		adminMethodLabel: 'Method',
		adminMethodEtransfer: 'e-Transfer',
		adminMethodCheque: 'Cheque',
		adminMethodCash: 'Cash',
		adminMethodUnknown: 'Unknown',
		adminDateLabel: 'Payment date',
		adminNotesLabel: 'Notes (optional)',
		adminSubmitPaymentBtn: 'Save payment & activate',
		adminPromoteBtn: 'Grant admin role',
		adminPromoteSuccess: 'Admin role granted. They may need to sign out and back in.',
		adminPromoteNoAccount: 'This member has no linked sign-in account (user id).',
		adminMemberEditHeading: 'Edit member',
		adminSaveMemberBtn: 'Save member',
		adminDetailHint: 'Select a member in the list or search, then edit below.',
		adminLoading: 'Loading…',
		adminErrorGeneric: 'Something went wrong.',
		adminPageOf: 'Page {{page}} of {{total}}',
		adminPrevPage: 'Previous',
		adminNextPage: 'Next',
		adminFilterApply: 'Apply',
		adminSelectMemberHint: 'Choose a member row to load details.',
		adminSecondaryEmailLabel: 'Secondary email',
		adminNotesFieldLabel: 'Internal notes',
		adminStatusMemberLabel: 'Member status',
		adminUserIdLabel: 'Linked auth user id',
		adminPrimaryEmailLabel: 'Primary email',
		adminBackToList: 'Clear selection',
		adminMemberSaved: 'Member saved.',
		adminPaymentSaved: 'Payment recorded and membership activated.',
		adminMembershipYearLabel: 'Membership year',
		adminFilterTierLabel: 'Membership type',
		adminFilterTierAll: 'All types',
		adminFilterTierGeneral: 'General only',
		adminFilterTierAssociate: 'Associate only',
		adminExportEmails: 'Copy email list',
		adminExportEmailsCopied: 'Comma-separated emails copied to clipboard.',
		adminCopyEmailsFallbackPrompt:
			'Automatic copy was blocked. Select the text below or use Copy to clipboard.',
		adminCopyEmailsDialogCopy: 'Copy to clipboard',
		adminCopyEmailsDialogClose: 'Close',
		adminExportEmailsHint:
			'Same filters as this table (non-empty primary email only). Get consent before bulk mail.',
		adminExportEmailsEmpty: 'No primary emails to copy for this view.',
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
		donationLabel: 'Optional donation (CAD)',
		donationHint: 'Add any amount to support the association, or leave at 0.',
		checkoutErrorGeneric: 'Could not start checkout. Please try again.',
		checkoutStripeMisconfigured: 'Online payment is not configured. Please use another payment method or try again later.',
		checkoutInvalidDonation: 'Enter a valid donation amount (0 or more, up to 50,000).',
		checkoutSuccessBanner:
			'Thank you. When your payment succeeds, your membership will show as active here shortly.',
		checkoutCancelledBanner: 'Checkout was cancelled. You can try again when you are ready.',
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
		linkEditProfile: 'Edit profile',
		linkCreateProfile: 'Create member profile',
		profileJoinTitle: 'Join | Lac Bernard Association',
		profileJoinDescription: 'Create your member profile to link your account to the association.',
		profileJoinHeroAria: 'New member profile',
		profileJoinHero: 'Create your profile',
		profileJoinIntro:
			'Enter your contact details as they should appear in our records. Your sign-in email is shown below and cannot be changed here.',
		profileEditTitle: 'Edit profile | Lac Bernard Association',
		profileEditDescription: 'Update your contact information on file with the association.',
		profileEditHeroAria: 'Edit profile',
		profileEditHero: 'Your profile',
		profileSectionContact: 'Contact',
		profileSectionLake: 'At the lake',
		profileSectionMailing: 'Mailing address',
		profileSignInEmail: 'Sign-in email',
		profileFirstName: 'First name',
		profileLastName: 'Last name',
		profilePrimaryPhone: 'Primary phone',
		profileSecondaryPhone: 'Secondary phone',
		profileLakePhone: 'Lake phone',
		profileLakeCivic: 'Civic number',
		profileLakeStreet: 'Street name',
		profileStreetAddress: 'Street address',
		profileCity: 'City',
		profileProvince: 'Province / state',
		profileCountry: 'Country',
		profilePostal: 'Postal code',
		profileEmailOptIn: 'Email me association updates (you can change this anytime)',
		profileCreateSubmit: 'Create profile',
		profileSaveSubmit: 'Save changes',
		profileBackToAccount: 'Back to member area',
		profileErrorLastName: 'Last name is required.',
		profileErrorAlreadyMember: 'A profile already exists for this account. Returning to the member area.',
		profileErrorSave: 'Could not save your profile. Please try again.',
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
			'Consultez les paiements en attente, les membres actifs ou non renouvelés par année, enregistrez les paiements manuels et attribuez le rôle administrateur aux comptes liés.',
		adminNavPending: 'Paiements en attente',
		adminNavActiveMembers: 'Membres actifs',
		adminNavNotRenewed: 'Non renouvelés',
		adminTableName: 'Nom',
		adminTableEmail: 'Courriel',
		adminTableYear: 'Année',
		adminTableTier: 'Type',
		adminTableStatus: 'Statut',
		adminTableCreated: 'Créé',
		adminTableActions: 'Actions',
		adminSearchLabel: 'Recherche',
		adminSortLabel: 'Tri',
		adminSortCreatedDesc: 'Plus récents',
		adminSortNameAsc: 'Nom de famille A–Z',
		adminPendingEmpty: 'Aucune adhésion en attente.',
		adminRecordPaymentBtn: 'Enregistrer le paiement',
		adminPaymentHeading: 'Paiement manuel',
		adminAmountLabel: 'Montant',
		adminMethodLabel: 'Mode',
		adminMethodEtransfer: 'Virement',
		adminMethodCheque: 'Chèque',
		adminMethodCash: 'Comptant',
		adminMethodUnknown: 'Inconnu',
		adminDateLabel: 'Date du paiement',
		adminNotesLabel: 'Notes (facultatif)',
		adminSubmitPaymentBtn: 'Enregistrer et activer',
		adminPromoteBtn: 'Accorder le rôle admin',
		adminPromoteSuccess: 'Rôle administrateur accordé. La personne devra peut-être se déconnecter et se reconnecter.',
		adminPromoteNoAccount: 'Ce membre n’a pas de compte de connexion lié (identifiant utilisateur).',
		adminMemberEditHeading: 'Modifier le membre',
		adminSaveMemberBtn: 'Enregistrer',
		adminDetailHint: 'Sélectionnez un membre dans la liste pour modifier les détails.',
		adminLoading: 'Chargement…',
		adminErrorGeneric: 'Une erreur s’est produite.',
		adminPageOf: 'Page {{page}} sur {{total}}',
		adminPrevPage: 'Précédent',
		adminNextPage: 'Suivant',
		adminFilterApply: 'Appliquer',
		adminSelectMemberHint: 'Choisissez une ligne pour charger les détails.',
		adminSecondaryEmailLabel: 'Courriel secondaire',
		adminNotesFieldLabel: 'Notes internes',
		adminStatusMemberLabel: 'Statut du membre',
		adminUserIdLabel: 'Identifiant de compte lié',
		adminPrimaryEmailLabel: 'Courriel principal',
		adminBackToList: 'Effacer la sélection',
		adminMemberSaved: 'Membre enregistré.',
		adminPaymentSaved: 'Paiement enregistré et adhésion activée.',
		adminMembershipYearLabel: 'Année d’adhésion',
		adminFilterTierLabel: 'Type d’adhésion',
		adminFilterTierAll: 'Tous les types',
		adminFilterTierGeneral: 'Générale seulement',
		adminFilterTierAssociate: 'Associée seulement',
		adminExportEmails: 'Copier la liste de courriels',
		adminExportEmailsCopied: 'Courriels séparés par des virgules copiés dans le presse-papiers.',
		adminCopyEmailsFallbackPrompt:
			'La copie automatique a été bloquée. Sélectionnez le texte ci-dessous ou utilisez Copier.',
		adminCopyEmailsDialogCopy: 'Copier dans le presse-papiers',
		adminCopyEmailsDialogClose: 'Fermer',
		adminExportEmailsHint:
			'Mêmes filtres que ce tableau (courriel principal non vide seulement). Obtenez le consentement avant un envoi de masse.',
		adminExportEmailsEmpty: 'Aucun courriel principal à copier pour cette vue.',
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
		donationLabel: 'Don facultatif (CAD)',
		donationHint: 'Ajoutez un montant pour soutenir l’association, ou laissez 0.',
		checkoutErrorGeneric: 'Impossible de démarrer le paiement. Veuillez réessayer.',
		checkoutStripeMisconfigured:
			'Le paiement en ligne n’est pas configuré. Utilisez un autre mode de paiement ou réessayez plus tard.',
		checkoutInvalidDonation: 'Entrez un montant de don valide (0 ou plus, jusqu’à 50 000).',
		checkoutSuccessBanner:
			'Merci. Lorsque le paiement est réussi, votre adhésion active s’affichera ici sous peu.',
		checkoutCancelledBanner: 'Le paiement a été annulé. Vous pouvez réessayer quand vous voulez.',
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
		linkEditProfile: 'Modifier le profil',
		linkCreateProfile: 'Créer un profil membre',
		profileJoinTitle: 'Adhésion | Association du lac Bernard',
		profileJoinDescription: 'Créez votre profil membre pour lier votre compte à l’association.',
		profileJoinHeroAria: 'Nouveau profil membre',
		profileJoinHero: 'Créer votre profil',
		profileJoinIntro:
			'Indiquez vos coordonnées telles qu’elles doivent figurer dans nos dossiers. Votre courriel de connexion est affiché ci-dessous; il ne peut pas être modifié ici.',
		profileEditTitle: 'Profil | Association du lac Bernard',
		profileEditDescription: 'Mettez à jour les coordonnées associées à votre dossier.',
		profileEditHeroAria: 'Modifier le profil',
		profileEditHero: 'Votre profil',
		profileSectionContact: 'Coordonnées',
		profileSectionLake: 'Au lac',
		profileSectionMailing: 'Adresse postale',
		profileSignInEmail: 'Courriel de connexion',
		profileFirstName: 'Prénom',
		profileLastName: 'Nom',
		profilePrimaryPhone: 'Téléphone principal',
		profileSecondaryPhone: 'Téléphone secondaire',
		profileLakePhone: 'Téléphone au lac',
		profileLakeCivic: 'Numéro civique',
		profileLakeStreet: 'Rue',
		profileStreetAddress: 'Adresse',
		profileCity: 'Ville',
		profileProvince: 'Province / État',
		profileCountry: 'Pays',
		profilePostal: 'Code postal',
		profileEmailOptIn: 'M’envoyer des nouvelles de l’association par courriel (modifiable à tout moment)',
		profileCreateSubmit: 'Créer le profil',
		profileSaveSubmit: 'Enregistrer',
		profileBackToAccount: 'Retour à l’espace membre',
		profileErrorLastName: 'Le nom est obligatoire.',
		profileErrorAlreadyMember: 'Un profil existe déjà pour ce compte. Retour à l’espace membre.',
		profileErrorSave: 'Enregistrement impossible. Veuillez réessayer.',
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
