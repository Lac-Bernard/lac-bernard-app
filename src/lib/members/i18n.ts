export type MemberLocale = 'en' | 'fr';

export const memberPaths: Record<
	MemberLocale,
	{
		account: string;
		signIn: string;
		admin: string;
		/** Base path for per-member admin pages (no trailing slash). */
		adminMembers: string;
		/** Add member (walk-in) admin page */
		adminMemberNew: string;
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
		adminMembers: '/en/membership/admin/members',
		adminMemberNew: '/en/membership/admin/members/new',
		enrollment: '/en/membership/enrollment',
		renewal: '/en/membership/renewal',
		join: '/en/membership/account/new',
		edit: '/en/membership/account/edit',
	},
	fr: {
		account: '/fr/membership/account',
		signIn: '/fr/membership/account/sign-in',
		admin: '/fr/membership/admin',
		adminMembers: '/fr/membership/admin/members',
		adminMemberNew: '/fr/membership/admin/members/new',
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
		adminNavOverview: string;
		adminNavMembers: string;
		adminNavNewMembers: string;
		adminNavAuditLog: string;
		adminAuditColWhen: string;
		adminAuditColActor: string;
		adminAuditColAction: string;
		adminAuditColEntity: string;
		adminAuditColMetadata: string;
		adminAuditEmpty: string;
		adminNavActiveMembers: string;
		adminNavNotRenewed: string;
		adminScopeLabel: string;
		adminScopeEveryone: string;
		adminScopeHasHistory: string;
		adminScopeActive: string;
		adminScopeNotRenewed: string;
		adminDetailTitle: string;
		adminDetailSectionProfile: string;
		adminDetailSectionMemberships: string;
		adminDetailPaymentsHeading: string;
		adminBackToAdmin: string;
		adminMethodStripe: string;
		adminOverviewRecentTitle: string;
		adminOverviewRecentVerifiedSubtitle: string;
		adminOverviewRecentActiveSubtitle: string;
		adminOverviewColWhen: string;
		adminOverviewCountPending: string;
		adminOverviewCountActive: string;
		adminOverviewCountNewMembers: string;
		adminOverviewKpiAriaMembers: string;
		adminOverviewKpiAriaPending: string;
		adminOverviewKpiAriaNewMembers: string;
		adminTableAmount: string;
		adminTableDuesPortion: string;
		adminTableDonationPortion: string;
		adminPaymentPreviewMembership: string;
		adminPaymentPreviewDonation: string;
		adminTablePaymentDate: string;
		adminPendingBadge: string;
		adminDetailNoMemberships: string;
		adminDetailPaymentsEmpty: string;
		adminDetailFutureBadge: string;
		adminDetailMembershipYearPicker: string;
		adminDetailStandardFee: string;
		adminDetailAmountMembership: string;
		adminDetailAmountDonation: string;
		adminDetailAmountTotal: string;
		adminDetailPaymentSummaryTitle: string;
		adminDetailBalanceDue: string;
		adminDetailDuesPaidInFull: string;
		adminDeletePaymentBtn: string;
		adminDeletePaymentConfirm: string;
		adminPaymentDeleted: string;
		adminDetailNoMembershipForYear: string;
		adminDetailDonationNoteLabel: string;
		adminTablePaymentRef: string;
		adminTableName: string;
		adminTableEmail: string;
		adminTableYear: string;
		adminTableTier: string;
		adminTableStatus: string;
		/** Pending tab: standard membership fee for tier (before optional donation) */
		adminTableExpectedFee: string;
		adminTableCreated: string;
		adminTableActions: string;
		adminSearchLabel: string;
		adminSortLabel: string;
		adminSortCreatedDesc: string;
		adminSortNameAsc: string;
		adminPendingEmpty: string;
		/** Trash control on pending tab */
		adminCancelPendingAriaLabel: string;
		adminCancelPendingConfirm: string;
		adminCancelPendingSuccess: string;
		adminCancelPendingErrorNotPending: string;
		adminRecordPaymentBtn: string;
		adminPaymentHeading: string;
		adminAmountLabel: string;
		adminMethodLabel: string;
		adminMethodEtransfer: string;
		adminMethodCheque: string;
		adminMethodCash: string;
		adminMethodUnknown: string;
		adminDateLabel: string;
		/** External reference stored in payments.payment_id (e-transfer, cheque #, Stripe id if entered manually) */
		adminPaymentReferenceLabel: string;
		adminNotesLabel: string;
		adminSubmitPaymentBtn: string;
		adminPromoteBtn: string;
		adminPromoteSuccess: string;
		adminPromoteNoAccount: string;
		adminMemberEditHeading: string;
		adminMemberOpen: string;
		adminSaveMemberBtn: string;
		adminDetailHint: string;
		adminAddMemberNav: string;
		adminAddMemberTitle: string;
		adminAddMemberSectionProfile: string;
		adminAddMemberSectionMembership: string;
		adminAddMemberCreateMembership: string;
		adminAddMemberSubmit: string;
		adminAddMemberInitialPending: string;
		adminAddMemberInitialPaid: string;
		adminAddMembershipOpen: string;
		adminAddMembershipDialogTitle: string;
		adminAddMembershipSubmit: string;
		adminAddMemberErrorNoLake: string;
		adminAddMemberErrorAddressTaken: string;
		adminAddMemberErrorDuplicateYear: string;
		adminAddMemberErrorMemberNotFound: string;
		adminLoading: string;
		adminErrorGeneric: string;
		adminPageOf: string;
		adminPrevPage: string;
		adminNextPage: string;
		adminFilterApply: string;
		adminSelectMemberHint: string;
		adminSecondaryEmailLabel: string;
		adminSecondaryFirstNameLabel: string;
		adminSecondaryLastNameLabel: string;
		adminSecondaryPhoneLabel: string;
		adminNotesFieldLabel: string;
		adminStatusMemberLabel: string;
		adminStatusMemberOptionNew: string;
		adminStatusMemberOptionVerified: string;
		adminStatusMemberOptionDisabled: string;
		adminStatusMemberFieldTitle: string;
		adminPromoteAdminTitle: string;
		adminUserIdLabel: string;
		adminPrimaryEmailLabel: string;
		adminSpousePartnerHelp: string;
		adminBackToList: string;
		adminMemberSaved: string;
		adminPaymentSaved: string;
		adminMembershipYearLabel: string;
		adminFilterTierLabel: string;
		adminFilterTierAll: string;
		adminFilterTierGeneral: string;
		adminFilterTierAssociate: string;
		adminMemberStatusFilterLabel: string;
		adminMemberStatusFilterVerified: string;
		adminMemberStatusFilterNew: string;
		adminMemberStatusFilterDisabled: string;
		adminMemberStatusFilterAll: string;
		adminNewMembersEmpty: string;
		adminNewMembersBadge: string;
		adminExportEmails: string;
		adminExportEmailsCopied: string;
		adminCopyEmailsFallbackPrompt: string;
		adminCopyEmailsDialogCopy: string;
		adminCopyEmailsDialogClose: string;
		adminExportEmailsHint: string;
		adminExportEmailsEmpty: string;
		membershipHistorySection: string;
		membershipHistoryLead: string;
		membershipTableYear: string;
		membershipTableType: string;
		membershipTableStatus: string;
		membershipStatusActive: string;
		membershipStatusPending: string;
		tierGeneral: string;
		tierAssociate: string;
		tierGeneralExplainer: string;
		tierGeneralExplainerWithAddress: string;
		tierAssociateExplainer: string;
		tierGeneralBlockedLead: string;
		noMemberForEmail: string;
		statusActiveTitle: string;
		statusActiveTierLabel: string;
		/** Shown under the active title — clarifies calendar-year coverage */
		statusActiveYearScope: string;
		/** When the member has prepaid future years; {{count}} is a number */
		statusActivePrepaidTeaser: string;
		/** Shown under general tier when active — line above the lake civic address */
		statusActiveGeneralVoteLabel: string;
		statusInactiveTitle: string;
		statusInactiveLead: string;
		statusInactiveStep1: string;
		statusInactiveStep2: string;
		statusInactiveStep3: string;
		tierChoiceLegend: string;
		createPendingSubmit: string;
		statusPendingTitle: string;
		statusPendingLead: string;
		cancelPending: string;
		pendingCreateErrorUnauthorized: string;
		pendingCreateErrorAlreadyActive: string;
		pendingCreateErrorAlreadyPending: string;
		pendingCreateErrorGeneric: string;
		pendingCreateErrorNoLakeAddress: string;
		pendingCreateErrorGeneralAddressTaken: string;
		pendingCancelErrorGeneric: string;
		pendingCancelErrorNotFound: string;
		payWithCard: string;
		donationLabel: string;
		donationHint: string;
		donationNoteLabel: string;
		donationNoteHint: string;
		checkoutModalTitle: string;
		checkoutModalMembershipLabel: string;
		checkoutModalFeeLabel: string;
		checkoutModalContinue: string;
		checkoutModalCancel: string;
		checkoutErrorGeneric: string;
		checkoutStripeMisconfigured: string;
		checkoutInvalidDonation: string;
		checkoutInvalidDonationNote: string;
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
		membershipPrepaidSection: string;
		membershipPrepaidLead: string;
		linkEditProfile: string;
		linkCreateProfile: string;
		/** Shown when lake or mailing address is empty on member home */
		homeAddressNotOnFile: string;
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
		profileSectionPrimaryMember: string;
		profileSectionSecondaryMember: string;
		profileShowSecondaryMember: string;
		profileSectionMailing: string;
		profileSignInEmail: string;
		profileSectionNamesOnMembership: string;
		profileSecondaryMemberHelp: string;
		profileLakeHelp: string;
		profileFirstName: string;
		profileLastName: string;
		profileSecondaryFirstName: string;
		profileSecondaryLastName: string;
		profileSecondaryEmail: string;
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
		/** Spaced conjunction between primary and co-listed names on the account card, e.g. " and " / " et ". */
		memberSummaryNameAnd: string;
	}
> = {
	en: {
		homeTitle: 'Member area | Lac Bernard Association',
		homeDescription: 'See your membership status for this year and how to renew or pay.',
		homeHero: 'Member area',
		signedInAs: 'Signed in as',
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
			'Review activity, pending payments, and the member directory; open a member to see full history, record manual payments, and grant admin access.',
		adminNavPending: 'Pending payments',
		adminNavOverview: 'Overview',
		adminNavMembers: 'Members',
		adminNavNewMembers: 'New members',
		adminNavAuditLog: 'Audit log',
		adminAuditColWhen: 'When',
		adminAuditColActor: 'Admin',
		adminAuditColAction: 'Action',
		adminAuditColEntity: 'Target',
		adminAuditColMetadata: 'Details',
		adminAuditEmpty: 'No audit entries yet.',
		adminNavActiveMembers: 'Active members',
		adminNavNotRenewed: 'Not renewed',
		adminScopeLabel: 'Show',
		adminScopeEveryone: 'Everyone',
		adminScopeHasHistory: 'With membership history',
		adminScopeActive: 'Active for {{year}}',
		adminScopeNotRenewed: 'Did not renew for {{year}}',
		adminDetailTitle: 'Member | Admin',
		adminDetailSectionProfile: 'Profile',
		adminDetailSectionMemberships: 'Memberships & payments',
		adminDetailPaymentsHeading: 'Payments',
		adminBackToAdmin: 'Back to admin',
		adminMethodStripe: 'Card (Stripe)',
		adminOverviewRecentTitle: 'Recent members',
		adminOverviewRecentVerifiedSubtitle: 'Recently added verified profiles',
		adminOverviewRecentActiveSubtitle: 'Recent active memberships',
		adminOverviewColWhen: 'When',
		adminOverviewCountPending: 'Pending memberships',
		adminOverviewCountActive: 'Active memberships ({{year}})',
		adminOverviewCountNewMembers: 'New members',
		adminOverviewKpiAriaMembers: '{{count}} active memberships for {{year}}. Open members directory.',
		adminOverviewKpiAriaPending: '{{count}} pending memberships. Open pending tab.',
		adminOverviewKpiAriaNewMembers: '{{count}} new member profiles. Open new members tab.',
		adminTableAmount: 'Total',
		adminTableDuesPortion: 'Dues',
		adminTableDonationPortion: 'Donation',
		adminPaymentPreviewMembership: 'Toward membership: {{amount}}',
		adminPaymentPreviewDonation: 'Donation: {{amount}}',
		adminTablePaymentDate: 'Paid',
		adminPendingBadge: '{{count}} pending',
		adminDetailNoMemberships: 'No membership records for this person yet.',
		adminDetailPaymentsEmpty: 'No payments recorded for this membership year.',
		adminDetailFutureBadge: 'Future / prepaid',
		adminDetailMembershipYearPicker: 'Membership year',
		adminDetailStandardFee: 'Standard fee ({{tier}})',
		adminDetailAmountMembership: 'Membership',
		adminDetailAmountDonation: 'Donation',
		adminDetailAmountTotal: 'Total paid',
		adminDetailPaymentSummaryTitle: 'Summary',
		adminDetailBalanceDue: 'Balance due (dues)',
		adminDetailDuesPaidInFull: 'Annual dues fully paid',
		adminDeletePaymentBtn: 'Remove',
		adminDeletePaymentConfirm:
			'Delete this payment? Membership status will be recalculated from remaining payments. This cannot be undone.',
		adminPaymentDeleted: 'Payment deleted.',
		adminDetailNoMembershipForYear: 'No membership on file for {{year}}.',
		adminDetailDonationNoteLabel: 'Donation note',
		adminTablePaymentRef: 'Reference',
		adminTableName: 'Name',
		adminTableEmail: 'Email',
		adminTableYear: 'Year',
		adminTableTier: 'Type',
		adminTableStatus: 'Status',
		adminTableExpectedFee: 'Expected fee',
		adminTableCreated: 'Created',
		adminTableActions: 'Actions',
		adminSearchLabel: 'Search',
		adminSortLabel: 'Sort',
		adminSortCreatedDesc: 'Newest first',
		adminSortNameAsc: 'Last name A–Z',
		adminPendingEmpty: 'No pending memberships.',
		adminCancelPendingAriaLabel: 'Remove pending membership',
		adminCancelPendingConfirm:
			'Delete this pending membership? The member will need to choose their membership type again the next time they sign in.',
		adminCancelPendingSuccess: 'Pending membership removed.',
		adminCancelPendingErrorNotPending: 'This membership is no longer pending.',
		adminRecordPaymentBtn: 'Record payment',
		adminPaymentHeading: 'Record manual payment',
		adminAmountLabel: 'Amount',
		adminMethodLabel: 'Method',
		adminMethodEtransfer: 'e-Transfer',
		adminMethodCheque: 'Cheque',
		adminMethodCash: 'Cash',
		adminMethodUnknown: 'Unknown',
		adminDateLabel: 'Payment date',
		adminPaymentReferenceLabel: 'Reference (optional) — e-transfer, cheque #, etc.',
		adminNotesLabel: 'Notes (optional)',
		adminSubmitPaymentBtn: 'Save payment',
		adminPromoteBtn: 'Grant admin role',
		adminPromoteSuccess: 'Admin role granted. They may need to sign out and back in.',
		adminPromoteNoAccount: 'This member has no linked sign-in account (user id).',
		adminMemberEditHeading: 'Edit member',
		adminMemberOpen: 'Open',
		adminSaveMemberBtn: 'Save member',
		adminDetailHint: 'Select a member in the list or search, then edit below.',
		adminAddMemberNav: 'Add member',
		adminAddMemberTitle: 'Add member',
		adminAddMemberSectionProfile: 'Profile',
		adminAddMemberSectionMembership: 'Membership',
		adminAddMemberCreateMembership: 'Add a membership for this calendar year',
		adminAddMemberSubmit: 'Create member',
		adminAddMemberInitialPending: 'Pending payment',
		adminAddMemberInitialPaid: 'Record payment now (cash, e-Transfer, etc.)',
		adminAddMembershipOpen: 'Add membership',
		adminAddMembershipDialogTitle: 'Add membership',
		adminAddMembershipSubmit: 'Add membership',
		adminAddMemberErrorNoLake:
			'General membership requires a lake civic number and street on this profile. Save the profile first, then try again.',
		adminAddMemberErrorAddressTaken:
			'Another member at this lake address already has a general membership for this year.',
		adminAddMemberErrorDuplicateYear: 'This member already has a membership for that year.',
		adminAddMemberErrorMemberNotFound: 'Member not found.',
		adminLoading: 'Loading…',
		adminErrorGeneric: 'Something went wrong.',
		adminPageOf: 'Page {{page}} of {{total}}',
		adminPrevPage: 'Previous',
		adminNextPage: 'Next',
		adminFilterApply: 'Apply',
		adminSelectMemberHint: 'Choose a member row to load details.',
		adminSecondaryEmailLabel: 'Secondary email',
		adminSecondaryFirstNameLabel: 'Secondary first name',
		adminSecondaryLastNameLabel: 'Secondary last name',
		adminSecondaryPhoneLabel: 'Secondary phone',
		adminNotesFieldLabel: 'Internal notes',
		adminStatusMemberLabel: 'Member status',
		adminStatusMemberOptionNew: 'New — not yet reviewed',
		adminStatusMemberOptionVerified: 'Verified — OK for directory and comms',
		adminStatusMemberOptionDisabled: 'Disabled — excluded from default directory and exports',
		adminStatusMemberFieldTitle:
			'New: self-serve profile not yet reviewed. Verified: ready for directory. Disabled: inactive / do not contact.',
		adminPromoteAdminTitle: 'Grant this member the admin role in app metadata (they may need to sign out and back in).',
		adminUserIdLabel: 'Linked auth user id',
		adminPrimaryEmailLabel: 'Primary email',
		adminSpousePartnerHelp:
			'Members can include a spouse or partner’s name and contact details for record-keeping purposes.',
		adminBackToList: 'Clear selection',
		adminMemberSaved: 'Member saved.',
		adminPaymentSaved: 'Payment recorded.',
		adminMembershipYearLabel: 'Membership year',
		adminFilterTierLabel: 'Membership type',
		adminFilterTierAll: 'All types',
		adminFilterTierGeneral: 'General only',
		adminFilterTierAssociate: 'Associate only',
		adminMemberStatusFilterLabel: 'Record status',
		adminMemberStatusFilterVerified: 'Verified (default)',
		adminMemberStatusFilterNew: 'New',
		adminMemberStatusFilterDisabled: 'Disabled',
		adminMemberStatusFilterAll: 'All',
		adminNewMembersEmpty: 'No member profiles awaiting review.',
		adminNewMembersBadge: '{{count}} new',
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
		membershipHistoryLead: 'Earlier years on file (for your reference).',
		membershipTableYear: 'Year',
		membershipTableType: 'Type',
		membershipTableStatus: 'Status',
		membershipStatusActive: 'Active',
		membershipStatusPending: 'Pending payment',
		tierGeneral: 'General',
		tierAssociate: 'Associate',
		tierGeneralExplainer:
			'Voting membership. One per lake property per calendar year. Requires a lake civic number and street on your profile.',
		tierGeneralExplainerWithAddress:
			'You’re purchasing the general membership for {{lakeAddress}}. You’ll be the voting member for that address for this year. Only one general membership is allowed per property per calendar year.',
		tierAssociateExplainer: 'Non-voting. Lake address is optional.',
		tierGeneralBlockedLead:
			'To request general membership, add your lake civic number and street under your profile:',
		pendingCreateErrorNoLakeAddress:
			'General membership requires a lake civic number and street on your profile.',
		pendingCreateErrorGeneralAddressTaken:
			'Another member at this lake address already has a general membership for this year.',
		noMemberForEmail:
			'We could not find a member profile linked to this sign-in email. If you use another address on file, sign in with that email or contact the association.',
		statusActiveTitle: 'Your {{year}} membership is active',
		statusActiveTierLabel: 'Membership type',
		statusActiveYearScope: 'Covers the full {{year}} calendar year (Jan 1–Dec 31).',
		statusActivePrepaidTeaser:
			'You also have {{count}} prepaid year(s) on file—see the section below.',
		statusActiveGeneralVoteLabel: 'Voting membership for this lake address:',
		statusInactiveTitle: 'No active membership for {{year}}',
		statusInactiveLead: 'Choose a membership type below, then start your request. General membership needs a lake address on your profile.',
		statusInactiveStep1: 'Pick general (voting) or associate (non-voting).',
		statusInactiveStep2: 'Submit the request — you’ll get payment instructions next.',
		statusInactiveStep3: 'Your membership activates when payment is received or recorded by the association.',
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
		donationNoteLabel: 'Note with your donation (optional)',
		donationNoteHint: 'Shown on your payment record. Max 500 characters.',
		checkoutModalTitle: 'Pay with card',
		checkoutModalMembershipLabel: 'Membership',
		checkoutModalFeeLabel: 'Membership fee',
		checkoutModalContinue: 'Continue to secure checkout',
		checkoutModalCancel: 'Cancel',
		checkoutErrorGeneric: 'Could not start checkout. Please try again.',
		checkoutStripeMisconfigured: 'Online payment is not configured. Please use another payment method or try again later.',
		checkoutInvalidDonation: 'Enter a valid donation amount (0 or more, up to 50,000).',
		checkoutInvalidDonationNote: 'Keep the note to 500 characters or fewer.',
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
		membershipPrepaidSection: 'Prepaid & upcoming years',
		membershipPrepaidLead:
			'These are on your record for years after the current calendar year—use this to confirm prepaid coverage without contacting the office.',
		linkEditProfile: 'Edit profile',
		linkCreateProfile: 'Create member profile',
		homeAddressNotOnFile: 'Not on file',
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
		profileSectionPrimaryMember: 'Member info',
		profileSectionSecondaryMember: 'Spouse/partner',
		profileShowSecondaryMember: 'Add spouse/partner details',
		profileSectionMailing: 'Mailing address',
		profileSignInEmail: 'Sign-in email',
		profileSectionNamesOnMembership: 'Names on membership',
		profileSecondaryMemberHelp:
			'You can include your spouse or partner’s name and contact details with your member information if you’d like, for record-keeping purposes.',
		profileLakeHelp:
			'Enter the Lac Bernard address tied to this household. A general membership requires this address.',
		profileFirstName: 'First name',
		profileLastName: 'Last name',
		profileSecondaryFirstName: 'First name',
		profileSecondaryLastName: 'Last name',
		profileSecondaryEmail: 'Email',
		profilePrimaryPhone: 'Primary phone',
		profileSecondaryPhone: 'Phone',
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
		memberSummaryNameAnd: ' and ',
	},
	fr: {
		homeTitle: 'Espace membre | Association du lac Bernard',
		homeDescription: 'Consultez le statut de votre adhésion pour l’année en cours et les options de paiement.',
		homeHero: 'Espace membre',
		signedInAs: 'Connecté en tant que',
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
			'Consultez l’activité, les paiements en attente et le répertoire; ouvrez un membre pour l’historique complet, enregistrer un paiement manuel ou attribuer le rôle administrateur.',
		adminNavPending: 'Paiements en attente',
		adminNavOverview: 'Aperçu',
		adminNavMembers: 'Membres',
		adminNavNewMembers: 'Nouveaux membres',
		adminNavAuditLog: 'Journal d’audit',
		adminAuditColWhen: 'Date et heure',
		adminAuditColActor: 'Administrateur',
		adminAuditColAction: 'Action',
		adminAuditColEntity: 'Cible',
		adminAuditColMetadata: 'Détails',
		adminAuditEmpty: 'Aucune entrée d’audit pour le moment.',
		adminNavActiveMembers: 'Membres actifs',
		adminNavNotRenewed: 'Non renouvelés',
		adminScopeLabel: 'Afficher',
		adminScopeEveryone: 'Tous',
		adminScopeHasHistory: 'Avec antécédents d’adhésion',
		adminScopeActive: 'Actifs pour {{year}}',
		adminScopeNotRenewed: 'Non renouvelés pour {{year}}',
		adminDetailTitle: 'Membre | Admin',
		adminDetailSectionProfile: 'Profil',
		adminDetailSectionMemberships: 'Adhésions et paiements',
		adminDetailPaymentsHeading: 'Paiements',
		adminBackToAdmin: 'Retour à l’administration',
		adminMethodStripe: 'Carte (Stripe)',
		adminOverviewRecentTitle: 'Membres récents',
		adminOverviewRecentVerifiedSubtitle: 'Profils vérifiés ajoutés récemment',
		adminOverviewRecentActiveSubtitle: 'Adhésions actives récentes',
		adminOverviewColWhen: 'Date',
		adminOverviewCountPending: 'Adhésions en attente',
		adminOverviewCountActive: 'Adhésions actives ({{year}})',
		adminOverviewCountNewMembers: 'Nouveaux membres',
		adminOverviewKpiAriaMembers:
			'{{count}} adhésions actives pour {{year}}. Ouvrir le répertoire des membres.',
		adminOverviewKpiAriaPending: '{{count}} adhésions en attente. Ouvrir l’onglet En attente.',
		adminOverviewKpiAriaNewMembers: '{{count}} nouveaux profils membres. Ouvrir l’onglet Nouveaux membres.',
		adminTableAmount: 'Total',
		adminTableDuesPortion: 'Cotisation',
		adminTableDonationPortion: 'Don',
		adminPaymentPreviewMembership: 'Vers la cotisation : {{amount}}',
		adminPaymentPreviewDonation: 'Don : {{amount}}',
		adminTablePaymentDate: 'Payé',
		adminPendingBadge: '{{count}} en attente',
		adminDetailNoMemberships: 'Aucune adhésion dans le dossier pour le moment.',
		adminDetailPaymentsEmpty: 'Aucun paiement enregistré pour cette année d’adhésion.',
		adminDetailFutureBadge: 'Futur / payé d’avance',
		adminDetailMembershipYearPicker: 'Année d’adhésion',
		adminDetailStandardFee: 'Cotisation de base ({{tier}})',
		adminDetailAmountMembership: 'Adhésion',
		adminDetailAmountDonation: 'Don',
		adminDetailAmountTotal: 'Total payé',
		adminDetailPaymentSummaryTitle: 'Sommaire',
		adminDetailBalanceDue: 'Solde dû (cotisation)',
		adminDetailDuesPaidInFull: 'Cotisation annuelle entièrement payée',
		adminDeletePaymentBtn: 'Retirer',
		adminDeletePaymentConfirm:
			'Supprimer ce paiement? Le statut d’adhésion sera recalculé selon les paiements restants. Action irréversible.',
		adminPaymentDeleted: 'Paiement supprimé.',
		adminDetailNoMembershipForYear: 'Aucune adhésion au dossier pour {{year}}.',
		adminDetailDonationNoteLabel: 'Note du don',
		adminTablePaymentRef: 'Référence',
		adminTableName: 'Nom',
		adminTableEmail: 'Courriel',
		adminTableYear: 'Année',
		adminTableTier: 'Type',
		adminTableStatus: 'Statut',
		adminTableExpectedFee: 'Cotisation prévue',
		adminTableCreated: 'Créé',
		adminTableActions: 'Actions',
		adminSearchLabel: 'Recherche',
		adminSortLabel: 'Tri',
		adminSortCreatedDesc: 'Plus récents',
		adminSortNameAsc: 'Nom de famille A–Z',
		adminPendingEmpty: 'Aucune adhésion en attente.',
		adminCancelPendingAriaLabel: 'Retirer l’adhésion en attente',
		adminCancelPendingConfirm:
			'Supprimer cette adhésion en attente? La personne devra choisir de nouveau son type d’adhésion lors de sa prochaine connexion.',
		adminCancelPendingSuccess: 'Adhésion en attente supprimée.',
		adminCancelPendingErrorNotPending: 'Cette adhésion n’est plus en attente.',
		adminRecordPaymentBtn: 'Enregistrer le paiement',
		adminPaymentHeading: 'Paiement manuel',
		adminAmountLabel: 'Montant',
		adminMethodLabel: 'Mode',
		adminMethodEtransfer: 'Virement',
		adminMethodCheque: 'Chèque',
		adminMethodCash: 'Comptant',
		adminMethodUnknown: 'Inconnu',
		adminDateLabel: 'Date du paiement',
		adminPaymentReferenceLabel: 'Référence (facultatif) — virement, nº de chèque, etc.',
		adminNotesLabel: 'Notes (facultatif)',
		adminSubmitPaymentBtn: 'Enregistrer le paiement',
		adminPromoteBtn: 'Accorder le rôle admin',
		adminPromoteSuccess: 'Rôle administrateur accordé. La personne devra peut-être se déconnecter et se reconnecter.',
		adminPromoteNoAccount: 'Ce membre n’a pas de compte de connexion lié (identifiant utilisateur).',
		adminMemberEditHeading: 'Modifier le membre',
		adminMemberOpen: 'Ouvrir',
		adminSaveMemberBtn: 'Enregistrer',
		adminDetailHint: 'Sélectionnez un membre dans la liste pour modifier les détails.',
		adminAddMemberNav: 'Ajouter un membre',
		adminAddMemberTitle: 'Ajouter un membre',
		adminAddMemberSectionProfile: 'Profil',
		adminAddMemberSectionMembership: 'Adhésion',
		adminAddMemberCreateMembership: 'Ajouter une adhésion pour cette année civile',
		adminAddMemberSubmit: 'Créer le membre',
		adminAddMemberInitialPending: 'En attente de paiement',
		adminAddMemberInitialPaid: 'Enregistrer le paiement maintenant (comptant, virement, etc.)',
		adminAddMembershipOpen: 'Ajouter une adhésion',
		adminAddMembershipDialogTitle: 'Ajouter une adhésion',
		adminAddMembershipSubmit: 'Ajouter',
		adminAddMemberErrorNoLake:
			'L’adhésion générale exige un numéro civique et une rue au lac dans ce profil. Enregistrez le profil d’abord, puis réessayez.',
		adminAddMemberErrorAddressTaken:
			'Un autre membre à cette adresse au lac a déjà une adhésion générale pour cette année.',
		adminAddMemberErrorDuplicateYear: 'Ce membre a déjà une adhésion pour cette année.',
		adminAddMemberErrorMemberNotFound: 'Membre introuvable.',
		adminLoading: 'Chargement…',
		adminErrorGeneric: 'Une erreur s’est produite.',
		adminPageOf: 'Page {{page}} sur {{total}}',
		adminPrevPage: 'Précédent',
		adminNextPage: 'Suivant',
		adminFilterApply: 'Appliquer',
		adminSelectMemberHint: 'Choisissez une ligne pour charger les détails.',
		adminSecondaryEmailLabel: 'Courriel secondaire',
		adminSecondaryFirstNameLabel: 'Prénom secondaire',
		adminSecondaryLastNameLabel: 'Nom secondaire',
		adminSecondaryPhoneLabel: 'Téléphone secondaire',
		adminNotesFieldLabel: 'Notes internes',
		adminStatusMemberLabel: 'Statut du membre',
		adminStatusMemberOptionNew: 'Nouveau — pas encore révisé',
		adminStatusMemberOptionVerified: 'Vérifié — OK pour le répertoire et les envois',
		adminStatusMemberOptionDisabled: 'Désactivé — exclu du répertoire par défaut et des exports',
		adminStatusMemberFieldTitle:
			'Nouveau : profil créé par le membre, non révisé. Vérifié : prêt pour le répertoire. Désactivé : inactif / ne pas contacter.',
		adminPromoteAdminTitle:
			'Accorder le rôle admin dans les métadonnées de l’application (déconnexion / reconnexion peut être nécessaire).',
		adminUserIdLabel: 'Identifiant de compte lié',
		adminPrimaryEmailLabel: 'Courriel principal',
		adminSpousePartnerHelp:
			'Les membres peuvent ajouter le nom et les coordonnées de leur conjoint, conjointe ou partenaire à des fins de tenue de dossier.',
		adminBackToList: 'Effacer la sélection',
		adminMemberSaved: 'Membre enregistré.',
		adminPaymentSaved: 'Paiement enregistré.',
		adminMembershipYearLabel: 'Année d’adhésion',
		adminFilterTierLabel: 'Type d’adhésion',
		adminFilterTierAll: 'Tous les types',
		adminFilterTierGeneral: 'Générale seulement',
		adminFilterTierAssociate: 'Associée seulement',
		adminMemberStatusFilterLabel: 'Statut du dossier',
		adminMemberStatusFilterVerified: 'Vérifiés (défaut)',
		adminMemberStatusFilterNew: 'Nouveau',
		adminMemberStatusFilterDisabled: 'Désactivé',
		adminMemberStatusFilterAll: 'Tous',
		adminNewMembersEmpty: 'Aucun profil en attente de révision.',
		adminNewMembersBadge: '{{count}} nouveaux',
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
		membershipHistoryLead: 'Années antérieures dans votre dossier (à titre indicatif).',
		membershipTableYear: 'Année',
		membershipTableType: 'Type',
		membershipTableStatus: 'Statut',
		membershipStatusActive: 'Active',
		membershipStatusPending: 'En attente de paiement',
		tierGeneral: 'Générale',
		tierAssociate: 'Associée',
		tierGeneralExplainer:
			'Adhésion avec droit de vote. Une par propriété au lac pour l’année civile. Exige le numéro civique et la rue au lac dans votre profil.',
		tierGeneralExplainerWithAddress:
			'Vous achetez l’adhésion générale pour {{lakeAddress}}. Vous serez le membre ayant le droit de vote pour cette adresse cette année. Une seule adhésion générale est permise par propriété par année civile.',
		tierAssociateExplainer: 'Sans droit de vote. L’adresse au lac est facultative.',
		tierGeneralBlockedLead:
			'Pour l’adhésion générale, ajoutez le numéro civique et la rue au lac dans votre profil :',
		pendingCreateErrorNoLakeAddress:
			'L’adhésion générale exige un numéro civique et une rue au lac dans votre profil.',
		pendingCreateErrorGeneralAddressTaken:
			'Un autre membre à cette adresse au lac a déjà une adhésion générale pour cette année.',
		noMemberForEmail:
			'Aucun profil membre n’est lié à cette adresse de connexion. Si vous utilisez une autre adresse dans nos dossiers, connectez-vous avec celle-ci ou communiquez avec l’association.',
		statusActiveTitle: 'Votre adhésion {{year}} est active',
		statusActiveTierLabel: 'Type d’adhésion',
		statusActiveYearScope: 'Valable pour l’année civile {{year}} (1er janv. au 31 déc.).',
		statusActivePrepaidTeaser:
			'Vous avez aussi {{count}} année(s) payée(s) d’avance dans votre dossier — voir la section ci-dessous.',
		statusActiveGeneralVoteLabel: 'Adhésion avec droit de vote pour l’adresse au lac :',
		statusInactiveTitle: 'Aucune adhésion active pour {{year}}',
		statusInactiveLead:
			'Choisissez un type d’adhésion ci-dessous, puis démarrez votre demande. L’adhésion générale exige une adresse au lac dans votre profil.',
		statusInactiveStep1: 'Choisissez l’adhésion générale (droit de vote) ou associée (sans droit de vote).',
		statusInactiveStep2: 'Envoyez la demande — les instructions de paiement suivront.',
		statusInactiveStep3: 'Votre adhésion devient active lorsque le paiement est reçu ou enregistré par l’association.',
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
		donationNoteLabel: 'Note accompagnant le don (facultatif)',
		donationNoteHint: 'Affichée sur votre dossier de paiement. 500 caractères maximum.',
		checkoutModalTitle: 'Payer par carte',
		checkoutModalMembershipLabel: 'Adhésion',
		checkoutModalFeeLabel: 'Cotisation',
		checkoutModalContinue: 'Continuer vers le paiement sécurisé',
		checkoutModalCancel: 'Annuler',
		checkoutErrorGeneric: 'Impossible de démarrer le paiement. Veuillez réessayer.',
		checkoutStripeMisconfigured:
			'Le paiement en ligne n’est pas configuré. Utilisez un autre mode de paiement ou réessayez plus tard.',
		checkoutInvalidDonation: 'Entrez un montant de don valide (0 ou plus, jusqu’à 50 000).',
		checkoutInvalidDonationNote: 'Limitez la note à 500 caractères ou moins.',
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
		membershipPrepaidSection: 'Années payées d’avance et à venir',
		membershipPrepaidLead:
			'Ces années figurent dans votre dossier après l’année civile en cours—vous pouvez vous y référer pour confirmer votre cotisation sans communiquer avec le bureau.',
		linkEditProfile: 'Modifier le profil',
		linkCreateProfile: 'Créer un profil membre',
		homeAddressNotOnFile: 'Non indiquée',
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
		profileSectionPrimaryMember: 'Info du membre',
		profileSectionSecondaryMember: 'Conjoint(e) / partenaire',
		profileShowSecondaryMember: 'Ajouter les coordonnées du conjoint ou de la conjointe',
		profileSectionMailing: 'Adresse postale',
		profileSignInEmail: 'Courriel de connexion',
		profileSectionNamesOnMembership: 'Noms sur l’adhésion',
		profileSecondaryMemberHelp:
			'Vous pouvez ajouter le nom et les coordonnées de votre conjoint, conjointe ou partenaire à votre dossier membre, si vous le souhaitez, à des fins de tenue de dossier.',
		profileLakeHelp:
			'Indiquez l’adresse au lac Bernard liée à ce foyer. Une adhésion générale exige cette adresse.',
		profileFirstName: 'Prénom',
		profileLastName: 'Nom',
		profileSecondaryFirstName: 'Prénom',
		profileSecondaryLastName: 'Nom',
		profileSecondaryEmail: 'Courriel',
		profilePrimaryPhone: 'Téléphone principal',
		profileSecondaryPhone: 'Téléphone',
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
		memberSummaryNameAnd: ' et ',
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
