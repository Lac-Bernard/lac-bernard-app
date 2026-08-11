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
		join: '/en/membership/account/new',
		edit: '/en/membership/account/edit',
	},
	fr: {
		account: '/fr/membership/account',
		signIn: '/fr/membership/account/sign-in',
		admin: '/fr/membership/admin',
		adminMembers: '/fr/membership/admin/members',
		adminMemberNew: '/fr/membership/admin/members/new',
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
		/** Admin/staff workspace: session line (viewer account), not the record on screen */
		workspaceYourAccount: string;
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
		/** Shown when magic link was superseded or expired (e.g. `signin_error=link_expired`). */
		signInLinkExpiredNotice: string;
		/** Shown when auth callback fails for reasons other than an expired link (catch-all; e.g. private browsing or cookie-blocking extensions). */
		signInAuthFailedNotice: string;
		/** Shown when user attempts to access admin with a non-admin account; includes `{{account}}`. */
		signInNotAdminNotice: string;
		/** Fallback of `signInNotAdminNotice` when no account identifier is available. */
		signInNotAdminNoticeNoAccount: string;
		adminTitle: string;
		adminDescription: string;
		adminHeroAria: string;
		adminHero: string;
		adminBody: string;
		adminNavPending: string;
		adminNavOverview: string;
		adminNavMembers: string;
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
		adminDetailSectionMemberships: string;
		adminDetailPaymentsHeading: string;
		adminBackToAdmin: string;
		/** `aria-label` for workspace breadcrumb on admin subpages */
		adminBreadcrumbAria: string;
		/** `<h1>` placeholder on member detail until the member record loads */
		adminMemberPageTitleLoading: string;
		adminMethodStripe: string;
		adminOverviewActivityTitle: string;
		adminKpiCurrentYearLabel: string;
		adminKpiActiveMembershipsLabel: string;
		adminKpiPendingPaymentsLabel: string;
		adminKpiNewMembersLast7DaysLabel: string;
		adminKpiAriaNewMembersLast7Days: string;
		adminTimelineEmpty: string;
		adminTimelineLoadMore: string;
		/** Timeline: non-Stripe payment */
		adminTimelineLabelPaymentRecorded: string;
		/** Timeline: Stripe card payment */
		adminTimelineLabelCardPayment: string;
		adminTimelineLabelProfileCreated: string;
		adminTimelineLabelMembershipPending: string;
		/** Activity timeline: Stripe processing fee, e.g. "Stripe fee {{amount}}" */
		adminTimelineStripeFee: string;
		adminTimelinePendingPaidPortion: string;
		adminOverviewCountPending: string;
		adminOverviewCountActive: string;
		adminOverviewKpiAriaMembers: string;
		adminOverviewKpiAriaPending: string;
		adminRelativeJustNow: string;
		adminRelativeMinAgo: string;
		adminRelativeHrAgo: string;
		adminRelativeHrsAgo: string;
		adminRelativeYesterday: string;
		adminRelativeDaysAgo: string;
		adminRelativeWeeksAgo: string;
		adminTableAmount: string;
		/** Stripe processing fee (CAD) on a payment row */
		adminTableStripeFee: string;
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
		/** Card header: list price for this membership type (not a payment line) */
		adminDetailTierScheduleDues: string;
		adminDetailAmountMembership: string;
		adminDetailAmountDonation: string;
		adminDetailAmountTotal: string;
		/** Payment summary: sum of payment amounts before processor fees */
		adminDetailGrossCollected: string;
		adminDetailStripeFeesWithheld: string;
		adminDetailNetToAssociation: string;
		adminDetailPaymentSummaryTitle: string;
		adminDetailBalanceDue: string;
		adminDetailDuesPaidInFull: string;
		adminDetailComplimentaryHint: string;
		adminDeletePaymentBtn: string;
		adminDeletePaymentConfirm: string;
		adminDeletePaymentConfirmStripe: string;
		adminDeletePaymentErrorRefundFailed: string;
		adminPaymentDeleted: string;
		adminDetailNoMembershipForYear: string;
		adminDetailDonationNoteLabel: string;
		adminTablePaymentRef: string;
		adminTableName: string;
		/** Member index: combined primary name + email column header */
		adminTableColMember: string;
		adminTablePrimaryName: string;
		adminTableEmail: string;
		adminTablePrimaryEmail: string;
		adminTableSecondaryName: string;
		adminTableSecondaryEmail: string;
		adminTableLakeCivic: string;
		adminTableLakeStreet: string;
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
		/** Helper under reference / notes on record-payment dialog */
		adminPaymentReferenceVisibleHint: string;
		adminNotesLabel: string;
		adminPaymentNotesVisibleHint: string;
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
		adminAddMemberInitialComplimentary: string;
		adminAddMembershipOpen: string;
		adminAddMembershipDialogTitle: string;
		adminAddMembershipSubmit: string;
		adminAddMemberErrorNoLake: string;
		adminAddMemberErrorAddressTaken: string;
		adminUpgradeToVotingBtn: string;
		adminUpgradeToVotingConfirm: string;
		adminUpgradeToVotingSuccess: string;
		adminUpgradeToVotingErrorNotAssociate: string;
		adminDeleteMemberBtn: string;
		adminDeleteMemberConfirm: string;
		adminDeleteMemberSuccess: string;
		adminDeleteMemberErrorHasMemberships: string;
		adminMakeComplimentaryBtn: string;
		adminMakeComplimentaryConfirm: string;
		adminMakeComplimentarySuccess: string;
		adminMakeComplimentaryErrorNotPending: string;
		adminRemoveComplimentaryBtn: string;
		adminRemoveComplimentaryConfirm: string;
		adminRemoveComplimentarySuccess: string;
		adminRemoveComplimentaryErrorNotComplimentary: string;
		adminAddMemberErrorDuplicateYear: string;
		adminAddMemberErrorMemberNotFound: string;
		adminLoading: string;
		adminErrorGeneric: string;
		adminToastClose: string;
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
		adminStatusMemberOptionEnrolled: string;
		adminStatusMemberOptionDisabled: string;
		adminStatusMemberFieldTitle: string;
		adminPromoteAdminTitle: string;
		adminUserIdLabel: string;
		adminPrimaryEmailLabel: string;
		adminSecondaryContactHelp: string;
		adminBackToList: string;
		adminMemberSaved: string;
		adminPaymentSaved: string;
		adminMembershipYearLabel: string;
		adminFilterTierLabel: string;
		adminFilterTierAll: string;
		adminFilterTierGeneral: string;
		adminFilterTierAssociate: string;
		adminMemberStatusFilterLabel: string;
		adminMemberStatusFilterEnrolled: string;
		adminMemberStatusFilterNew: string;
		adminMemberStatusFilterDisabled: string;
		adminMemberStatusFilterAll: string;
		adminExportEmails: string;
		adminExportEmailsCopied: string;
		adminCopyEmailsFallbackPrompt: string;
		adminCopyEmailsDialogCopy: string;
		adminCopyEmailsDialogClose: string;
		adminExportEmailsHint: string;
		adminExportEmailsEmpty: string;
		adminExportMembersCsv: string;
		adminExportMembersCsvHint: string;
		adminExportMembersCsvSuccess: string;
		adminMemberIndexSearchPlaceholder: string;
		adminSortNameDesc: string;
		adminSortCreatedAsc: string;
		adminIncludeDisabled: string;
		adminLapsedSinceInline: string;
		/** Plain-language note: {{lapsedSince}}, {{currentYear}} */
		adminLapsedSinceNote: string;
		adminViewVoting: string;
		adminViewAssociate: string;
		adminViewMailing: string;
		adminViewPending: string;
		adminViewLapsed: string;
		adminViewIncomplete: string;
		adminViewAll: string;
		adminViewDuplicate: string;
		adminMemberIndexMetaVoting: string;
		adminMemberIndexMetaAssociate: string;
		adminMemberIndexMetaMailing: string;
		/** Shown under view pills when "mailing" (active members) view is selected; {{year}} = membership year */
		adminMemberIndexViewDescMailing: string;
		adminMemberIndexMetaPending: string;
		adminMemberIndexMetaLapsed: string;
		adminMemberIndexMetaIncomplete: string;
		adminMemberIndexMetaAll: string;
		adminMemberIndexMetaDuplicate: string;
		adminMemberIndexMetaSearch: string;
		adminMemberIndexEmailOptInAppend: string;
		adminCopyEmailListOptIn: string;
		adminExportCsvRows: string;
		adminEmailListModalTitle: string;
		adminEmailModalClose: string;
		adminEmailModalSublineOptIn: string;
		adminEmailModalSublineAll: string;
		adminTableColSecondary: string;
		adminTableColLake: string;
		adminTableColSince: string;
		adminTableColLastActive: string;
		adminStatusMemberEnrolledLabel: string;
		adminStatusBadgePending: string;
		adminStatusBadgeNew: string;
		adminStatusBadgeDisabled: string;
		adminEmptyVoting: string;
		adminEmptyAssociate: string;
		adminEmptyMailing: string;
		adminEmptyPending: string;
		adminEmptyLapsed: string;
		adminEmptyIncomplete: string;
		adminEmptyAll: string;
		adminEmptyDuplicate: string;
		adminSearchNoResults: string;
		adminSearchTryDisabled: string;
		adminSearchTryDisabledLink: string;
		adminEmailOptOutDotAria: string;
		adminRowOpenChevronAria: string;
		adminCsvColMemberStatus: string;
		adminCsvColSince: string;
		adminCsvColLastActive: string;
		adminCsvColMemberEmail: string;
		adminCsvColSecondaryName: string;
		adminCsvColSecondaryEmail: string;
		adminCsvColLakeAddress: string;
		adminCsvColMembershipType: string;
		adminCsvColMembershipYear: string;
		membershipHistorySection: string;
		membershipHistoryLead: string;
		membershipTableYear: string;
		membershipTableType: string;
		membershipTableStatus: string;
		membershipStatusActive: string;
		membershipStatusPending: string;
		membershipStatusComplimentary: string;
		tierGeneral: string;
		tierAssociate: string;
		tierGeneralExplainer: string;
		tierGeneralExplainerWithAddress: string;
		tierAssociateExplainer: string;
		tierGeneralBlockedLead: string;
		tierGeneralAddressTakenNotice: string;
		noMemberForEmail: string;
		statusActiveTitle: string;
		statusActiveTierLabel: string;
		/** Shown under the active title — clarifies calendar-year coverage */
		statusActiveYearScope: string;
		/** When the member has prepaid future years; {{count}} is a number */
		statusActivePrepaidTeaser: string;
		/** Shown under voting tier when active — line above the lake civic address */
		statusActiveGeneralVoteLabel: string;
		/** Active card: payment history subsection */
		memberPaymentsSectionTitle: string;
		memberPaymentsSectionLead: string;
		memberPaymentsColDate: string;
		memberPaymentsColMethod: string;
		memberPaymentsColTotal: string;
		memberPaymentsColMembership: string;
		memberPaymentsColDonation: string;
		memberPaymentsColReference: string;
		memberPaymentsColNote: string;
		/** Admin-entered payment notes (payments.notes), distinct from donation note */
		memberPaymentsColRecordNote: string;
		memberPaymentsEmpty: string;
		memberPaymentMethodStripe: string;
		memberPaymentMethodEtransfer: string;
		memberPaymentMethodCheque: string;
		memberPaymentMethodCash: string;
		memberPaymentMethodUnknown: string;
		/** Active card: compact status chip */
		memberActiveBadge: string;
		memberActiveSnapshotHeading: string;
		memberActiveSnapshotTypeLabel: string;
		memberActiveSnapshotFeeLabel: string;
		/** Shown instead of the fee amount when the membership is complimentary */
		memberActiveSnapshotFeeComplimentary: string;
		/** One-line stats above payment list; {{count}}, {{donation}} */
		memberActivePaymentOverview: string;
		/** When no donation amounts this year; {{count}} */
		memberActivePaymentOverviewFeesOnly: string;
		memberActivePaymentItemTotal: string;
		memberActivePaymentSplitMembership: string;
		memberActivePaymentSplitDonation: string;
		memberActivePaymentReference: string;
		/** Expandable block for payment reference / internal record note */
		memberPaymentSeeDetails: string;
		statusInactiveTitle: string;
		statusInactiveLead: string;
		statusInactiveStep1: string;
		statusInactiveStep2: string;
		statusInactiveStep3: string;
		tierChoiceLegend: string;
		/** Inactive card: pay by Interac, cheque, or cash (creates pending, then shows instructions) */
		payOtherMethodsBtn: string;
		statusPendingTitle: string;
		statusPendingLead: string;
		/** Pending card: show amount already credited toward annual dues (e.g. after tier upgrade) */
		statusPendingDuesCredited: string;
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
		/** Shorter helper under the optional note field in the card checkout modal */
		checkoutModalNoteHint: string;
		checkoutModalTitle: string;
		checkoutModalMembershipLabel: string;
		checkoutModalFeeLabel: string;
		checkoutModalDonationLabel: string;
		donationCategoryLabel: string;
		donationCategoryEnvironment: string;
		donationCategoryRegatta: string;
		donationCategoryGeneral: string;
		donationCategoryUnspecified: string;
		checkoutModalTotalLabel: string;
		checkoutModalContinue: string;
		/** Shown on the checkout modal submit control while redirecting to Stripe */
		checkoutModalContinuing: string;
		checkoutModalCancel: string;
		checkoutErrorGeneric: string;
		checkoutStripeMisconfigured: string;
		checkoutInvalidDonation: string;
		checkoutInvalidDonationNote: string;
		checkoutErrorNothingDue: string;
		checkoutSuccessBanner: string;
		checkoutCancelledBanner: string;
		checkoutErrorBanner: string;
		otherPaymentTitle: string;
		/** Pending card: under “Other ways to pay”, optional donation when paying offline */
		otherPaymentDonationTitle: string;
		otherPaymentDonationBody: string;
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
		profileLakeDisplayHelp: string;
		/** Shown once above contact fields; explains the * marker. */
		profileRequiredFieldsNote: string;
		/** Appended to optional field labels, e.g. "First name (optional)". */
		profileOptionalMark: string;
		profileFirstName: string;
		profileLastName: string;
		profileSecondaryFirstName: string;
		profileSecondaryLastName: string;
		profileSecondaryEmail: string;
		profilePrimaryPhone: string;
		profileSecondaryPhone: string;
		profileLakeCivic: string;
		profileLakeStreet: string;
		profileLakeSearchLabel: string;
		profileLakeSearchPlaceholder: string;
		profileLakeManualLink: string;
		profileLakeNoSuggestions: string;
		profileLakeBackToSearch: string;
		profileStreetAddress: string;
		profileCity: string;
		profileProvince: string;
		profileCountry: string;
		profilePostal: string;
		profileEmailOptIn: string;
		profileCreateSubmit: string;
		profileSaveSubmit: string;
		profileBackToAccount: string;
		profileErrorFirstName: string;
		profileErrorLastName: string;
		profileErrorPrimaryEmail: string;
		profileErrorSecondaryEmail: string;
		profileErrorSecondaryContact: string;
		profileErrorPhone: string;
		profileErrorLakeAddress: string;
		profileErrorAlreadyMember: string;
		profileErrorSave: string;
	}
> = {
	en: {
		homeTitle: 'Member area | Lac Bernard Association',
		homeDescription: 'See your membership status for this year and how to renew or pay.',
		homeHero: 'Member area',
		signedInAs: 'Signed in as',
		workspaceYourAccount: 'Your account',
		signOut: 'Sign out',
		signInTitle: 'Member sign in | Lac Bernard Association',
		signInDescription:
			'Sign in to renew, pay dues, and manage your member profile—email link or Google.',
		signInHeroAria: 'Sign in',
		signInHero: 'Member sign in',
		signInLead:
			'Renew, pay dues, and keep your profile up to date. Sign in with email or Google—no separate password to manage.',
		signInDivider: 'or',
		signInWithGoogle: 'Continue with Google',
		emailLabel: 'Email',
		emailPlaceholder: 'you@example.com',
		sendMagicLink: 'Send sign-in link',
		sendingMagicLink: 'Sending link…',
		signInTryAnotherEmail: 'Use a different email',
		errorGeneric: 'Something went wrong. Please try again.',
		errorNetwork: 'Network error. Please try again.',
		magicLinkFormExplainer:
			'We’ll email a one-time link to this address. If nothing arrives in a few minutes, check spam or junk.',
		checkEmail: 'Check your email for the sign-in link.',
		signInLinkExpiredNotice:
			'You followed a sign-in link that is no longer valid. That usually means we sent a newer link to your email, or this link expired. Use the latest email from us, or request a new sign-in link.',
		signInAuthFailedNotice:
			'That sign-in link could not finish signing you in. Private or incognito mode and cookie-blocking or privacy extensions often get in the way—try in a regular browser window, pause blockers if you use them, and try sending a new sign-in link.',
		signInNotAdminNotice:
			'You’re signed in as {{account}}, but this account doesn’t have admin access. To visit the admin area, please sign in with an admin account.',
		signInNotAdminNoticeNoAccount:
			'This account doesn’t have admin access. To visit the admin area, please sign in with an admin account.',
		adminTitle: 'Admin | Lac Bernard Association',
		adminDescription: 'Association administration — members and payments.',
		adminHeroAria: 'Administration',
		adminHero: 'Administration',
		adminBody:
			'Review activity and the member directory; open a member to see full history, record manual payments, and grant admin access.',
		adminNavPending: 'Pending payments',
		adminNavOverview: 'Overview',
		adminNavMembers: 'Members',
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
		adminDetailSectionMemberships: 'Memberships & payments',
		adminDetailPaymentsHeading: 'Payments',
		adminBackToAdmin: 'Back to admin/members',
		adminBreadcrumbAria: 'Breadcrumb',
		adminMemberPageTitleLoading: 'Member',
		adminMethodStripe: 'Card (Stripe)',
		adminOverviewActivityTitle: 'Activity',
		adminKpiCurrentYearLabel: 'Current year',
		adminKpiActiveMembershipsLabel: 'Active memberships',
		adminKpiPendingPaymentsLabel: 'Pending payments',
		adminKpiNewMembersLast7DaysLabel: 'New members (last 7 days)',
		adminKpiAriaNewMembersLast7Days:
			'{{count}} member profiles created in the last 7 days. Informational.',
		adminTimelineEmpty: 'No recent activity.',
		adminTimelineLoadMore: 'Load more',
		adminTimelineLabelPaymentRecorded: 'Payment recorded',
		adminTimelineLabelCardPayment: 'Card payment',
		adminTimelineLabelProfileCreated: 'New member profile created',
		adminTimelineLabelMembershipPending: 'Membership pending',
		adminTimelineStripeFee: 'Stripe fee {{amount}}',
		adminTimelinePendingPaidPortion: 'Paid {{amount}}',
		adminOverviewCountPending: 'Pending memberships',
		adminOverviewCountActive: 'Active memberships ({{year}})',
		adminOverviewKpiAriaMembers: '{{count}} active memberships for {{year}}. Open members directory.',
		adminOverviewKpiAriaPending: '{{count}} pending memberships. Open members, pending payments view.',
		adminRelativeJustNow: 'Just now',
		adminRelativeMinAgo: '{{n}} min ago',
		adminRelativeHrAgo: '{{n}} hr ago',
		adminRelativeHrsAgo: '{{n}} hrs ago',
		adminRelativeYesterday: 'Yesterday',
		adminRelativeDaysAgo: '{{n}} days ago',
		adminRelativeWeeksAgo: '{{n}} weeks ago',
		adminTableAmount: 'Total',
		adminTableStripeFee: 'Stripe fee',
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
		adminDetailTierScheduleDues: 'Scheduled annual dues: {{amount}}',
		adminDetailAmountMembership: 'Membership',
		adminDetailAmountDonation: 'Donation',
		adminDetailAmountTotal: 'Total paid',
		adminDetailGrossCollected: 'Gross collected',
		adminDetailStripeFeesWithheld: 'Stripe fees (withheld)',
		adminDetailNetToAssociation: 'Net to association',
		adminDetailPaymentSummaryTitle: 'Summary',
		adminDetailBalanceDue: 'Balance due (dues)',
		adminDetailDuesPaidInFull: 'Annual dues fully paid',
		adminDetailComplimentaryHint: 'Complimentary membership — no payment required',
		adminDeletePaymentBtn: 'Remove',
		adminDeletePaymentConfirm:
			'Delete this payment? Membership status will be recalculated from remaining payments. This cannot be undone.',
		adminDeletePaymentConfirmStripe:
			'Delete this payment and refund {{amount}} via Stripe? Membership status will be recalculated from remaining payments. This cannot be undone.',
		adminDeletePaymentErrorRefundFailed: 'Could not refund this payment in Stripe. Nothing was deleted.',
		adminPaymentDeleted: 'Payment deleted.',
		adminDetailNoMembershipForYear: 'No membership on file for {{year}}.',
		adminDetailDonationNoteLabel: 'Donation note',
		adminTablePaymentRef: 'Reference',
		adminTableName: 'Name',
		adminTableColMember: 'Member',
		adminTablePrimaryName: 'Primary name',
		adminTableEmail: 'Email',
		adminTablePrimaryEmail: 'Primary email',
		adminTableSecondaryName: 'Secondary name',
		adminTableSecondaryEmail: 'Secondary email',
		adminTableLakeCivic: 'Civic #',
		adminTableLakeStreet: 'Street',
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
		adminPaymentReferenceVisibleHint: 'Visible to the member on their account.',
		adminNotesLabel: 'Notes (optional)',
		adminPaymentNotesVisibleHint: 'Visible to the member on their account.',
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
		adminAddMemberInitialComplimentary: 'Complimentary (no payment collected)',
		adminAddMembershipOpen: 'Add membership',
		adminAddMembershipDialogTitle: 'Add membership',
		adminAddMembershipSubmit: 'Add membership',
		adminAddMemberErrorNoLake:
			'Voting membership requires a lake civic number and street on this profile. Save the profile first, then try again.',
		adminAddMemberErrorAddressTaken:
			'Another member at this lake address already has a voting membership for this year.',
		adminUpgradeToVotingBtn: 'Upgrade to voting membership',
		adminUpgradeToVotingConfirm:
			'Upgrade this membership to voting? Previous payments still count toward dues; the member will owe any balance.',
		adminUpgradeToVotingSuccess: 'Membership upgraded to voting.',
		adminUpgradeToVotingErrorNotAssociate: 'This row is not an associate membership (already voting or invalid).',
		adminDeleteMemberBtn: 'Delete member',
		adminDeleteMemberConfirm:
			'Permanently delete this member? This cannot be undone. Only members with no memberships can be deleted.',
		adminDeleteMemberSuccess: 'Member deleted.',
		adminDeleteMemberErrorHasMemberships: 'This member has memberships on file and cannot be deleted.',
		adminMakeComplimentaryBtn: 'Make complimentary',
		adminMakeComplimentaryConfirm: 'Make this membership complimentary? No payment will be required and it will become active immediately.',
		adminMakeComplimentarySuccess: 'Membership marked complimentary and activated.',
		adminMakeComplimentaryErrorNotPending: 'This membership is no longer pending.',
		adminRemoveComplimentaryBtn: 'Remove complimentary status',
		adminRemoveComplimentaryConfirm:
			'Remove complimentary status from this membership? It will revert to pending, or active if enough payments are already on file.',
		adminRemoveComplimentarySuccess: 'Complimentary status removed.',
		adminRemoveComplimentaryErrorNotComplimentary: 'This membership is not complimentary.',
		adminAddMemberErrorDuplicateYear: 'This member already has a membership for that year.',
		adminAddMemberErrorMemberNotFound: 'Member not found.',
		adminLoading: 'Loading…',
		adminErrorGeneric: 'Something went wrong.',
		adminToastClose: 'Close',
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
		adminStatusMemberOptionNew: 'New — no membership activated yet',
		adminStatusMemberOptionEnrolled: 'Enrolled — OK for directory and comms',
		adminStatusMemberOptionDisabled: 'Disabled — excluded from default directory and exports',
		adminStatusMemberFieldTitle:
			'New: no membership activated yet. Enrolled: directory-ready. Disabled: inactive / do not contact.',
		adminPromoteAdminTitle: 'Grant this member the admin role in app metadata (they may need to sign out and back in).',
		adminUserIdLabel: 'Linked auth user id',
		adminPrimaryEmailLabel: 'Primary email',
		adminSecondaryContactHelp:
			'Members can add a secondary contact’s name and details for record-keeping purposes.',
		adminBackToList: 'Clear selection',
		adminMemberSaved: 'Member saved.',
		adminPaymentSaved: 'Payment recorded.',
		adminMembershipYearLabel: 'Membership year',
		adminFilterTierLabel: 'Membership type',
		adminFilterTierAll: 'All types',
		adminFilterTierGeneral: 'Voting only',
		adminFilterTierAssociate: 'Associate only',
		adminMemberStatusFilterLabel: 'Record status',
		adminMemberStatusFilterEnrolled: 'Enrolled (default)',
		adminMemberStatusFilterNew: 'New',
		adminMemberStatusFilterDisabled: 'Disabled',
		adminMemberStatusFilterAll: 'All',
		adminExportEmails: 'Copy email list',
		adminExportEmailsCopied: 'Comma-separated emails copied to clipboard.',
		adminCopyEmailsFallbackPrompt:
			'Automatic copy was blocked. Select the text below or use Copy to clipboard.',
		adminCopyEmailsDialogCopy: 'Copy to clipboard',
		adminCopyEmailsDialogClose: 'Close',
		adminExportEmailsHint:
			'Same filters as this table (non-empty primary email only). If a secondary email is on file, it is included too, with each person’s name on their address. Get consent before bulk mail.',
		adminExportEmailsEmpty: 'No primary emails to copy for this view.',
		adminExportMembersCsv: 'Export CSV',
		adminExportMembersCsvHint: 'Download a CSV for the same filters as this table (UTF-8).',
		adminExportMembersCsvSuccess: 'Member list downloaded.',
		adminMemberIndexSearchPlaceholder: 'Search by name or email…',
		adminSortNameDesc: 'Name Z–A',
		adminSortCreatedAsc: 'Oldest first',
		adminIncludeDisabled: 'Include disabled members',
		adminLapsedSinceInline: 'Lapsed since',
		adminLapsedSinceNote:
			'— members active in {{lapsedSince}} or later with no {{currentYear}} membership.',
		adminViewVoting: 'Voting members',
		adminViewAssociate: 'Associate members',
		adminViewMailing: 'Active members',
		adminViewPending: 'Pending payment',
		adminViewLapsed: 'Lapsed',
		adminViewIncomplete: 'Incomplete signups',
		adminViewAll: 'All members',
		adminViewDuplicate: 'Duplicate lake addresses',
		adminMemberIndexMetaVoting: '{{count}} voting members',
		adminMemberIndexMetaAssociate: '{{count}} associate members',
		adminMemberIndexMetaMailing: '{{count}} active members',
		adminMemberIndexViewDescMailing:
			'All members with an active membership for {{year}} — voting and associate.',
		adminMemberIndexMetaPending: '{{count}} pending memberships',
		adminMemberIndexMetaLapsed: '{{count}} lapsed members',
		adminMemberIndexMetaIncomplete: '{{count}} incomplete signups',
		adminMemberIndexMetaAll: '{{count}} members',
		adminMemberIndexMetaDuplicate: '{{count}} members with a duplicate lake address',
		adminMemberIndexMetaSearch: '{{count}} results across all members',
		adminMemberIndexEmailOptInAppend: ' · {{count}} opted in to email',
		adminCopyEmailListOptIn: 'Copy email list (opted in)',
		adminExportCsvRows: 'Export CSV · {{count}} rows',
		adminEmailListModalTitle: 'Email list — {{view}}',
		adminEmailModalClose: 'Close',
		adminEmailModalSublineOptIn: '{{optedIn}} opted-in addresses from {{total}} active members',
		adminEmailModalSublineAll: '{{total}} addresses — all members in this view regardless of opt-in preference',
		adminTableColSecondary: 'Secondary',
		adminTableColLake: 'Lake address',
		adminTableColSince: 'Since',
		adminTableColLastActive: 'Last active',
		adminStatusMemberEnrolledLabel: 'Enrolled',
		adminStatusBadgePending: 'pending',
		adminStatusBadgeNew: 'new',
		adminStatusBadgeDisabled: 'disabled',
		adminEmptyVoting: 'No active voting members for {{year}} yet.',
		adminEmptyAssociate: 'No active associate members for {{year}} yet.',
		adminEmptyMailing: 'No active members for {{year}} yet.',
		adminEmptyPending: 'No pending payments — all clear.',
		adminEmptyLapsed: 'No members lapsed since {{year}}. Everyone who was active then has renewed.',
		adminEmptyIncomplete:
			'No incomplete signups — everyone who created a profile has completed a membership.',
		adminEmptyAll: 'No member records found.',
		adminEmptyDuplicate: 'No duplicate lake addresses found.',
		adminSearchNoResults: 'No members match “{{query}}”.',
		adminSearchTryDisabled: 'No results — ',
		adminSearchTryDisabledLink: 'try including disabled members',
		adminEmailOptOutDotAria: 'Not opted in to association email',
		adminRowOpenChevronAria: 'Open member',
		adminCsvColMemberStatus: 'Status',
		adminCsvColSince: 'Since',
		adminCsvColLastActive: 'Last active',
		adminCsvColMemberName: 'Member name',
		adminCsvColMemberEmail: 'Member email',
		adminCsvColSecondaryName: 'Secondary name',
		adminCsvColSecondaryEmail: 'Secondary email',
		adminCsvColLakeAddress: 'Lake address',
		adminCsvColMembershipType: 'Membership type',
		adminCsvColMembershipYear: 'Membership year',
		membershipHistorySection: 'Membership history',
		membershipHistoryLead: 'Earlier years on file (for your reference).',
		membershipTableYear: 'Year',
		membershipTableType: 'Type',
		membershipTableStatus: 'Status',
		membershipStatusActive: 'Active',
		membershipStatusPending: 'Pending payment',
		membershipStatusComplimentary: 'Complimentary',
		tierGeneral: 'Voting',
		tierAssociate: 'Associate',
		tierGeneralExplainer:
			'Full voting membership. Requires a lake address. Limit of one voting membership per property.',
		tierGeneralExplainerWithAddress:
			'Full voting membership for {{lakeAddress}}. Limit of one voting membership per property.',
		tierAssociateExplainer:
			'Non-voting membership with all the other benefits.',
		tierGeneralBlockedLead:
			'To request voting membership, add your lake civic number and street under your profile:',
		tierGeneralAddressTakenNotice:
			"{{lakeAddress}} already has a voting membership registered for {{year}}. If you believe this is a mistake, please email membership@lacbernard.ca.",
		pendingCreateErrorNoLakeAddress:
			'Voting membership requires a lake civic number and street on your profile.',
		pendingCreateErrorGeneralAddressTaken:
			"We're sorry, we're having trouble registering a voting membership for {{lakeAddress}}. Please email membership@lacbernard.ca and we'll help sort it out.",
		noMemberForEmail:
			'We could not find a member profile linked to this sign-in email. If you use another address on file, sign in with that email or contact the association.',
		statusActiveTitle: 'Your {{year}} membership is active',
		statusActiveTierLabel: 'Membership type',
		statusActiveYearScope: 'Covers the full {{year}} calendar year (Jan 1–Dec 31).',
		statusActivePrepaidTeaser:
			'You also have {{count}} prepaid year(s) on file—see the section below.',
		statusActiveGeneralVoteLabel: 'Voting membership for this lake address:',
		memberPaymentsSectionTitle: 'Payment history',
		memberPaymentsSectionLead: 'Receipts for this membership year—including any optional donation you added.',
		memberPaymentsColDate: 'Date',
		memberPaymentsColMethod: 'Method',
		memberPaymentsColTotal: 'Total',
		memberPaymentsColMembership: 'Membership',
		memberPaymentsColDonation: 'Donation',
		memberPaymentsColReference: 'Reference',
		memberPaymentsColNote: 'Note',
		memberPaymentsColRecordNote: 'Record note',
		memberPaymentsEmpty: 'No payments are listed for this year yet.',
		memberPaymentMethodStripe: 'Card',
		memberPaymentMethodEtransfer: 'INTERAC e-Transfer',
		memberPaymentMethodCheque: 'Cheque',
		memberPaymentMethodCash: 'Cash',
		memberPaymentMethodUnknown: 'Other',
		memberActiveBadge: 'Registered',
		memberActiveSnapshotHeading: 'Membership details',
		memberActiveSnapshotTypeLabel: 'Type',
		memberActiveSnapshotFeeLabel: 'Annual fee',
		memberActiveSnapshotFeeComplimentary: 'Complimentary',
		memberActivePaymentOverview: '{{count}} payments on file · {{donation}} in donations',
		memberActivePaymentOverviewFeesOnly: '{{count}} payment(s) on file for this year',
		memberActivePaymentItemTotal: 'Total',
		memberActivePaymentSplitMembership: 'Membership',
		memberActivePaymentSplitDonation: 'Donation',
		memberActivePaymentReference: 'Reference',
		memberPaymentSeeDetails: 'See details',
		statusInactiveTitle: 'No active membership for {{year}}',
		statusInactiveLead:
			'Choose a membership type below, then pay with a card or pick another payment method. Voting membership needs a lake address on your profile.',
		statusInactiveStep1: 'Pick voting or associate (non-voting).',
		statusInactiveStep2:
			'Use Pay with credit card (optional donation in the window that opens) or Pay another way for Interac, cheque, or cash.',
		statusInactiveStep3: 'Your membership activates when payment is received or recorded by the association.',
		tierChoiceLegend: 'Membership type',
		payOtherMethodsBtn: 'Pay another way',
		statusPendingTitle: 'Your {{year}} membership is pending payment',
		statusPendingLead:
			'Use one of the options below to pay. Your membership will become active when payment is confirmed (online or by an administrator).',
		statusPendingDuesCredited: 'Already credited toward membership dues: {{amount}}.',
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
		checkoutModalNoteHint: 'Max 500 characters.',
		checkoutModalTitle: 'Pay with card',
		checkoutModalMembershipLabel: 'Membership',
		checkoutModalFeeLabel: 'Membership fee',
		checkoutModalDonationLabel: 'Donation (optional)',
		donationCategoryLabel: 'Donation category',
		donationCategoryEnvironment: 'Environment',
		donationCategoryRegatta: 'Regatta',
		donationCategoryGeneral: 'General',
		donationCategoryUnspecified: 'Not specified',
		checkoutModalTotalLabel: 'Total',
		checkoutModalContinue: 'Continue to secure checkout',
		checkoutModalContinuing: 'Continuing…',
		checkoutModalCancel: 'Cancel',
		checkoutErrorGeneric: 'Could not start checkout. Please try again.',
		checkoutStripeMisconfigured: 'Online payment is not configured. Please use another payment method or try again later.',
		checkoutInvalidDonation: 'Enter a valid donation amount (0 or more, up to 50,000).',
		checkoutInvalidDonationNote: 'Keep the note to 500 characters or fewer.',
		checkoutErrorNothingDue:
			'No membership balance is due right now. If this looks wrong, contact the association.',
		checkoutSuccessBanner:
			'Thank you. Your payment went through and your membership is now active.',
		checkoutCancelledBanner: 'Checkout was cancelled. You can try again when you are ready.',
		checkoutErrorBanner:
			'We could not confirm your payment from this link. If you completed checkout, your membership will update shortly; otherwise try paying again from this page.',
		otherPaymentTitle: 'Other ways to pay',
		otherPaymentDonationTitle: 'Want to contribute a little more?',
		otherPaymentDonationBody:
			"You're welcome to include an additional donation to ORALB along with your membership payment. To direct your gift to a specific fund or project, simply add a note in the e-transfer message field, or the memo field on your cheque.",
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
			'Complete your profile to get your household details on file, then you can purchase a membership.',
		profileEditTitle: 'Edit profile | Lac Bernard Association',
		profileEditDescription: 'Update your contact information on file with the association.',
		profileEditHeroAria: 'Edit profile',
		profileEditHero: 'Your profile',
		profileSectionContact: 'Contact',
		profileSectionLake: 'Lake address',
		profileSectionPrimaryMember: 'Member info',
		profileSectionSecondaryMember: 'Secondary contact',
		profileShowSecondaryMember: 'Add secondary contact details',
		profileSectionMailing: 'Mailing address',
		profileSignInEmail: 'Sign-in email',
		profileSectionNamesOnMembership: 'Names on membership',
		profileSecondaryMemberHelp:
			'You can add a secondary contact’s name and details to your member record if you wish, for record-keeping purposes.',
		profileLakeHelp:
			"Your lake address is required for voting membership. Associate members don't need to add one.",
		profileLakeDisplayHelp:
			'This is the Lac Bernard address on file for your household and the address tied to voting membership.',
		profileRequiredFieldsNote: 'Fields marked with * are required.',
		profileOptionalMark: '(optional)',
		profileFirstName: 'First name',
		profileLastName: 'Last name',
		profileSecondaryFirstName: 'First name',
		profileSecondaryLastName: 'Last name',
		profileSecondaryEmail: 'Email',
		profilePrimaryPhone: 'Primary phone',
		profileSecondaryPhone: 'Phone',
		profileLakeCivic: 'Civic number',
		profileLakeStreet: 'Street name',
		profileLakeSearchLabel: 'Find your lake address',
		profileLakeSearchPlaceholder: 'Start typing your lake address',
		profileLakeManualLink: "My address isn't listed",
		profileLakeNoSuggestions: 'No matches — try manual entry below.',
		profileLakeBackToSearch: 'Search for an address',
		profileStreetAddress: 'Street address',
		profileCity: 'City',
		profileProvince: 'Province / state',
		profileCountry: 'Country',
		profilePostal: 'Postal code',
		profileEmailOptIn: 'Email me association updates (you can change this anytime)',
		profileCreateSubmit: 'Create profile',
		profileSaveSubmit: 'Save changes',
		profileBackToAccount: 'Back to member area',
		profileErrorFirstName: 'First name is required.',
		profileErrorLastName: 'Last name is required.',
		profileErrorPrimaryEmail: 'The email on this account is not valid. Please contact us if this continues.',
		profileErrorSecondaryEmail: 'Enter a valid email for the secondary contact.',
		profileErrorSecondaryContact: 'Add at least one detail for the secondary contact or uncheck the option.',
		profileErrorPhone: 'Enter a valid phone number.',
		profileErrorLakeAddress: 'Enter both the lake civic number and street name, or leave both blank.',
		profileErrorAlreadyMember: 'A profile already exists for this account. Returning to the member area.',
		profileErrorSave: 'Could not save your profile. Please try again.',
	},
	fr: {
		homeTitle: 'Espace membre | Association du lac Bernard',
		homeDescription: 'Consultez le statut de votre adhésion pour l’année en cours et les options de paiement.',
		homeHero: 'Espace membre',
		signedInAs: 'Connecté en tant que',
		workspaceYourAccount: 'Votre compte',
		signOut: 'Se déconnecter',
		signInTitle: 'Connexion membre | Association du lac Bernard',
		signInDescription:
			'Connexion à l’espace membre : renouvellement, paiements et profil—lien par courriel ou Google.',
		signInHeroAria: 'Connexion',
		signInHero: 'Connexion membre',
		signInLead:
			'Renouvelez, payez vos cotisations et mettez votre profil à jour. Connexion par courriel ou Google—sans mot de passe distinct à gérer.',
		signInDivider: 'ou',
		signInWithGoogle: 'Continuer avec Google',
		emailLabel: 'Courriel',
		emailPlaceholder: 'vous@exemple.com',
		sendMagicLink: 'Envoyer le lien de connexion',
		sendingMagicLink: 'Envoi du lien…',
		signInTryAnotherEmail: 'Utiliser une autre adresse',
		errorGeneric: 'Une erreur s’est produite. Veuillez réessayer.',
		errorNetwork: 'Erreur réseau. Veuillez réessayer.',
		magicLinkFormExplainer:
			'Nous enverrons un lien à usage unique à cette adresse. Si rien n’arrive après quelques minutes, vérifiez vos indésirables.',
		checkEmail: 'Vérifiez votre courriel pour le lien de connexion.',
		signInLinkExpiredNotice:
			'Vous avez suivi un lien de connexion qui n’est plus valide. En général, cela signifie qu’un lien plus récent vous a été envoyé par courriel, ou que ce lien a expiré. Utilisez le dernier courriel de notre part, ou demandez un nouveau lien de connexion.',
		signInAuthFailedNotice:
			'Ce lien de connexion n’a pas abouti. La navigation privée ou une extension qui bloque les cookies ou le pistage s’en mêle souvent—essayez dans une fenêtre de navigation habituelle, mettez les bloqueurs en pause si vous en utilisez, et essayez d’envoyer un nouveau lien de connexion.',
		signInNotAdminNotice:
			'Vous êtes connecté avec {{account}}, mais ce compte n’a pas accès à l’administration. Pour accéder à l’espace d’administration, connectez-vous avec un compte administrateur.',
		signInNotAdminNoticeNoAccount:
			'Ce compte n’a pas accès à l’administration. Pour accéder à l’espace d’administration, connectez-vous avec un compte administrateur.',
		adminTitle: 'Administration | Association du lac Bernard',
		adminDescription: 'Administration de l’association — membres et paiements.',
		adminHeroAria: 'Administration',
		adminHero: 'Administration',
		adminBody:
			'Consultez l’activité et le répertoire; ouvrez un membre pour l’historique complet, enregistrer un paiement manuel ou attribuer le rôle administrateur.',
		adminNavPending: 'Paiements en attente',
		adminNavOverview: 'Aperçu',
		adminNavMembers: 'Membres',
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
		adminDetailSectionMemberships: 'Adhésions et paiements',
		adminDetailPaymentsHeading: 'Paiements',
		adminBackToAdmin: 'Retour à admin/membres',
		adminBreadcrumbAria: 'Fil d’Ariane',
		adminMemberPageTitleLoading: 'Membre',
		adminMethodStripe: 'Carte (Stripe)',
		adminOverviewActivityTitle: 'Activité récente',
		adminKpiCurrentYearLabel: 'Année en cours',
		adminKpiActiveMembershipsLabel: 'Adhésions actives',
		adminKpiPendingPaymentsLabel: 'Paiements en attente',
		adminKpiNewMembersLast7DaysLabel: 'Nouveaux membres (7 derniers jours)',
		adminKpiAriaNewMembersLast7Days:
			'{{count}} fiches membres créées au cours des 7 derniers jours. Information seulement.',
		adminTimelineEmpty: 'Aucune activité récente.',
		adminTimelineLoadMore: 'Charger plus',
		adminTimelineLabelPaymentRecorded: 'Paiement enregistré',
		adminTimelineLabelCardPayment: 'Paiement par carte',
		adminTimelineLabelProfileCreated: 'Nouvelle fiche membre créée',
		adminTimelineLabelMembershipPending: 'Adhésion en attente',
		adminTimelineStripeFee: 'Frais Stripe {{amount}}',
		adminTimelinePendingPaidPortion: 'Payé {{amount}}',
		adminOverviewCountPending: 'Adhésions en attente',
		adminOverviewCountActive: 'Adhésions actives ({{year}})',
		adminOverviewKpiAriaMembers:
			'{{count}} adhésions actives pour {{year}}. Ouvrir le répertoire des membres.',
		adminOverviewKpiAriaPending:
			'{{count}} adhésions en attente. Ouvrir Membres, vue Paiements en attente.',
		adminRelativeJustNow: 'À l’instant',
		adminRelativeMinAgo: 'Il y a {{n}} min',
		adminRelativeHrAgo: 'Il y a {{n}} h',
		adminRelativeHrsAgo: 'Il y a {{n}} h',
		adminRelativeYesterday: 'Hier',
		adminRelativeDaysAgo: 'Il y a {{n}} jours',
		adminRelativeWeeksAgo: 'Il y a {{n}} sem.',
		adminTableAmount: 'Total',
		adminTableStripeFee: 'Frais Stripe',
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
		adminDetailTierScheduleDues: 'Cotisation annuelle prévue : {{amount}}',
		adminDetailAmountMembership: 'Adhésion',
		adminDetailAmountDonation: 'Don',
		adminDetailAmountTotal: 'Total payé',
		adminDetailGrossCollected: 'Total encaissé (brut)',
		adminDetailStripeFeesWithheld: 'Frais Stripe (retenus)',
		adminDetailNetToAssociation: 'Net pour l’association',
		adminDetailPaymentSummaryTitle: 'Sommaire',
		adminDetailBalanceDue: 'Solde dû (cotisation)',
		adminDetailDuesPaidInFull: 'Cotisation annuelle entièrement payée',
		adminDetailComplimentaryHint: 'Adhésion offerte — aucun paiement requis',
		adminDeletePaymentBtn: 'Retirer',
		adminDeletePaymentConfirm:
			'Supprimer ce paiement? Le statut d’adhésion sera recalculé selon les paiements restants. Action irréversible.',
		adminDeletePaymentConfirmStripe:
			'Supprimer ce paiement et rembourser {{amount}} via Stripe? Le statut d’adhésion sera recalculé selon les paiements restants. Action irréversible.',
		adminDeletePaymentErrorRefundFailed:
			'Impossible de rembourser ce paiement dans Stripe. Rien n’a été supprimé.',
		adminPaymentDeleted: 'Paiement supprimé.',
		adminDetailNoMembershipForYear: 'Aucune adhésion au dossier pour {{year}}.',
		adminDetailDonationNoteLabel: 'Note du don',
		adminTablePaymentRef: 'Référence',
		adminTableName: 'Nom',
		adminTableColMember: 'Membre',
		adminTablePrimaryName: 'Nom principal',
		adminTableEmail: 'Courriel',
		adminTablePrimaryEmail: 'Courriel principal',
		adminTableSecondaryName: 'Nom secondaire',
		adminTableSecondaryEmail: 'Courriel secondaire',
		adminTableLakeCivic: 'Nº civique',
		adminTableLakeStreet: 'Rue',
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
		adminPaymentReferenceVisibleHint: 'Visible par le membre dans son compte.',
		adminNotesLabel: 'Notes (facultatif)',
		adminPaymentNotesVisibleHint: 'Visible par le membre dans son compte.',
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
		adminAddMemberInitialComplimentary: 'Offerte (aucun paiement perçu)',
		adminAddMembershipOpen: 'Ajouter une adhésion',
		adminAddMembershipDialogTitle: 'Ajouter une adhésion',
		adminAddMembershipSubmit: 'Ajouter',
		adminAddMemberErrorNoLake:
			'L’adhésion avec droit de vote exige un numéro civique et une rue au lac dans ce profil. Enregistrez le profil d’abord, puis réessayez.',
		adminAddMemberErrorAddressTaken:
			'Un autre membre à cette adresse au lac a déjà une adhésion avec droit de vote pour cette année.',
		adminUpgradeToVotingBtn: 'Passer à l’adhésion avec droit de vote',
		adminUpgradeToVotingConfirm:
			'Passer cette adhésion au vote ? Les paiements antérieurs restent crédités; il restera à payer le solde.',
		adminUpgradeToVotingSuccess: 'Adhésion passée au vote.',
		adminUpgradeToVotingErrorNotAssociate:
			'Cette ligne n’est pas une adhésion associée (déjà vote ou invalide).',
		adminDeleteMemberBtn: 'Supprimer le membre',
		adminDeleteMemberConfirm:
			'Supprimer définitivement ce membre? Cette action est irréversible. Seuls les membres sans adhésion peuvent être supprimés.',
		adminDeleteMemberSuccess: 'Membre supprimé.',
		adminDeleteMemberErrorHasMemberships: 'Ce membre a des adhésions au dossier et ne peut pas être supprimé.',
		adminMakeComplimentaryBtn: 'Rendre complimentaire',
		adminMakeComplimentaryConfirm:
			'Rendre cette adhésion complimentaire ? Aucun paiement ne sera requis et elle deviendra active immédiatement.',
		adminMakeComplimentarySuccess: 'Adhésion rendue complimentaire et activée.',
		adminMakeComplimentaryErrorNotPending: 'Cette adhésion n’est plus en attente.',
		adminRemoveComplimentaryBtn: 'Retirer le statut complimentaire',
		adminRemoveComplimentaryConfirm:
			'Retirer le statut complimentaire de cette adhésion ? Elle redeviendra en attente, ou active si suffisamment de paiements sont déjà enregistrés.',
		adminRemoveComplimentarySuccess: 'Statut complimentaire retiré.',
		adminRemoveComplimentaryErrorNotComplimentary: 'Cette adhésion n’est pas complimentaire.',
		adminAddMemberErrorDuplicateYear: 'Ce membre a déjà une adhésion pour cette année.',
		adminAddMemberErrorMemberNotFound: 'Membre introuvable.',
		adminLoading: 'Chargement…',
		adminErrorGeneric: 'Une erreur s’est produite.',
		adminToastClose: 'Fermer',
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
		adminStatusMemberOptionNew: 'Nouveau — aucune adhésion activée pour l’instant',
		adminStatusMemberOptionEnrolled: 'Inscrit — OK pour le répertoire et les envois',
		adminStatusMemberOptionDisabled: 'Désactivé — exclu du répertoire par défaut et des exports',
		adminStatusMemberFieldTitle:
			'Nouveau : aucune adhésion activée. Inscrit : prêt pour le répertoire. Désactivé : inactif / ne pas contacter.',
		adminPromoteAdminTitle:
			'Accorder le rôle admin dans les métadonnées de l’application (déconnexion / reconnexion peut être nécessaire).',
		adminUserIdLabel: 'Identifiant de compte lié',
		adminPrimaryEmailLabel: 'Courriel principal',
		adminSecondaryContactHelp:
			'Les membres peuvent ajouter le nom et les coordonnées d’un contact secondaire à des fins de tenue de dossier.',
		adminBackToList: 'Effacer la sélection',
		adminMemberSaved: 'Membre enregistré.',
		adminPaymentSaved: 'Paiement enregistré.',
		adminMembershipYearLabel: 'Année d’adhésion',
		adminFilterTierLabel: 'Type d’adhésion',
		adminFilterTierAll: 'Tous les types',
		adminFilterTierGeneral: 'Avec droit de vote seulement',
		adminFilterTierAssociate: 'Associée seulement',
		adminMemberStatusFilterLabel: 'Statut du dossier',
		adminMemberStatusFilterEnrolled: 'Inscrits (défaut)',
		adminMemberStatusFilterNew: 'Nouveau',
		adminMemberStatusFilterDisabled: 'Désactivé',
		adminMemberStatusFilterAll: 'Tous',
		adminExportEmails: 'Copier la liste de courriels',
		adminExportEmailsCopied: 'Courriels séparés par des virgules copiés dans le presse-papiers.',
		adminCopyEmailsFallbackPrompt:
			'La copie automatique a été bloquée. Sélectionnez le texte ci-dessous ou utilisez Copier.',
		adminCopyEmailsDialogCopy: 'Copier dans le presse-papiers',
		adminCopyEmailsDialogClose: 'Fermer',
		adminExportEmailsHint:
			'Mêmes filtres que ce tableau (courriel principal non vide seulement). Si un courriel secondaire est indiqué, il est inclus aussi, avec le nom de chaque personne sur son adresse. Obtenez le consentement avant un envoi de masse.',
		adminExportEmailsEmpty: 'Aucun courriel principal à copier pour cette vue.',
		adminExportMembersCsv: 'Exporter CSV',
		adminExportMembersCsvHint: 'Télécharger un CSV selon les mêmes filtres que ce tableau (UTF-8).',
		adminExportMembersCsvSuccess: 'Liste des membres téléchargée.',
		adminMemberIndexSearchPlaceholder: 'Rechercher par nom ou courriel…',
		adminSortNameDesc: 'Nom Z à A',
		adminSortCreatedAsc: 'Plus anciens en premier',
		adminIncludeDisabled: 'Inclure les membres désactivés',
		adminLapsedSinceInline: 'Inactifs depuis',
		adminLapsedSinceNote:
			'— membres actifs en {{lapsedSince}} ou après sans adhésion {{currentYear}}.',
		adminViewVoting: 'Membres votants',
		adminViewAssociate: 'Membres associés',
		adminViewMailing: 'Membres actifs',
		adminViewPending: 'Paiement en attente',
		adminViewLapsed: 'Inactifs',
		adminViewIncomplete: 'Inscriptions incomplètes',
		adminViewAll: 'Tous les membres',
		adminViewDuplicate: 'Adresses au lac en double',
		adminMemberIndexMetaVoting: '{{count}} membres votants',
		adminMemberIndexMetaAssociate: '{{count}} membres associés',
		adminMemberIndexMetaMailing: '{{count}} membres actifs',
		adminMemberIndexViewDescMailing:
			'Tous les membres ayant une adhésion active pour {{year}} — votants et associés.',
		adminMemberIndexMetaPending: '{{count}} adhésions en attente',
		adminMemberIndexMetaLapsed: '{{count}} membres inactifs',
		adminMemberIndexMetaIncomplete: '{{count}} inscriptions incomplètes',
		adminMemberIndexMetaAll: '{{count}} membres',
		adminMemberIndexMetaDuplicate: '{{count}} membres avec une adresse au lac en double',
		adminMemberIndexMetaSearch: '{{count}} résultats parmi tous les membres',
		adminMemberIndexEmailOptInAppend: ' · {{count}} inscrits aux courriels',
		adminCopyEmailListOptIn: 'Copier la liste de courriels (inscrits)',
		adminExportCsvRows: 'Exporter CSV · {{count}} lignes',
		adminEmailListModalTitle: 'Liste de courriels — {{view}}',
		adminEmailModalClose: 'Fermer',
		adminEmailModalSublineOptIn: '{{optedIn}} adresses inscrites sur {{total}} membres actifs',
		adminEmailModalSublineAll:
			'{{total}} adresses — tous les membres de cette vue, peu importe l’inscription aux courriels',
		adminTableColSecondary: 'Secondaire',
		adminTableColLake: 'Adresse au lac',
		adminTableColSince: 'Depuis',
		adminTableColLastActive: 'Dernière activité',
		adminStatusMemberEnrolledLabel: 'Inscrit',
		adminStatusBadgePending: 'en attente',
		adminStatusBadgeNew: 'nouveau',
		adminStatusBadgeDisabled: 'désactivé',
		adminEmptyVoting: 'Aucun membre votant actif pour {{year}} pour l’instant.',
		adminEmptyAssociate: 'Aucun membre associé actif pour {{year}} pour l’instant.',
		adminEmptyMailing: 'Aucun membre actif pour {{year}} pour l’instant.',
		adminEmptyPending: 'Aucun paiement en attente — tout est en ordre.',
		adminEmptyLapsed:
			'Aucun membre inactif depuis {{year}}. Tous ceux qui étaient actifs alors se sont réinscrits.',
		adminEmptyIncomplete:
			'Aucune inscription incomplète — toute personne ayant créé un profil a complété une adhésion.',
		adminEmptyAll: 'Aucun membre dans le dossier.',
		adminEmptyDuplicate: 'Aucune adresse au lac en double trouvée.',
		adminSearchNoResults: 'Aucun membre ne correspond à « {{query}} ».',
		adminSearchTryDisabled: 'Aucun résultat — ',
		adminSearchTryDisabledLink: 'essayez d’inclure les membres désactivés',
		adminEmailOptOutDotAria: 'Non inscrit aux courriels de l’association',
		adminRowOpenChevronAria: 'Ouvrir le membre',
		adminCsvColMemberStatus: 'Statut',
		adminCsvColSince: 'Depuis',
		adminCsvColLastActive: 'Dernière activité',
		adminCsvColMemberName: 'Nom du membre',
		adminCsvColMemberEmail: 'Courriel du membre',
		adminCsvColSecondaryName: 'Nom secondaire',
		adminCsvColSecondaryEmail: 'Courriel secondaire',
		adminCsvColLakeAddress: 'Adresse au lac',
		adminCsvColMembershipType: 'Type d’adhésion',
		adminCsvColMembershipYear: 'Année d’adhésion',
		membershipHistorySection: 'Historique des adhésions',
		membershipHistoryLead: 'Années antérieures dans votre dossier (à titre indicatif).',
		membershipTableYear: 'Année',
		membershipTableType: 'Type',
		membershipTableStatus: 'Statut',
		membershipStatusActive: 'Active',
		membershipStatusPending: 'En attente de paiement',
		membershipStatusComplimentary: 'Offerte',
		tierGeneral: 'Votant',
		tierAssociate: 'Associée',
		tierGeneralExplainer:
			'Adhésion avec droit de vote complète. Exige une adresse au lac. Limite d’une adhésion avec droit de vote par propriété.',
		tierGeneralExplainerWithAddress:
			'Adhésion avec droit de vote complète pour {{lakeAddress}}. Limite d’une adhésion avec droit de vote par propriété.',
		tierAssociateExplainer:
			'Adhésion sans droit de vote avec tous les autres avantages.',
		tierGeneralBlockedLead:
			'Pour l’adhésion avec droit de vote, ajoutez le numéro civique et la rue au lac dans votre profil :',
		tierGeneralAddressTakenNotice:
			"{{lakeAddress}} a déjà une adhésion avec droit de vote enregistrée pour {{year}}. Si vous croyez qu'il s'agit d'une erreur, écrivez-nous à membership@lacbernard.ca.",
		pendingCreateErrorNoLakeAddress:
			'L’adhésion avec droit de vote exige un numéro civique et une rue au lac dans votre profil.',
		pendingCreateErrorGeneralAddressTaken:
			"Nous sommes désolés, nous avons du mal à inscrire une adhésion avec droit de vote pour {{lakeAddress}}. Écrivez-nous à membership@lacbernard.ca et nous vous aiderons à régler la situation.",
		noMemberForEmail:
			'Aucun profil membre n’est lié à cette adresse de connexion. Si vous utilisez une autre adresse dans nos dossiers, connectez-vous avec celle-ci ou communiquez avec l’association.',
		statusActiveTitle: 'Votre adhésion {{year}} est active',
		statusActiveTierLabel: 'Type d’adhésion',
		statusActiveYearScope: 'Valable pour l’année civile {{year}} (1er janv. au 31 déc.).',
		statusActivePrepaidTeaser:
			'Vous avez aussi {{count}} année(s) payée(s) d’avance dans votre dossier — voir la section ci-dessous.',
		statusActiveGeneralVoteLabel: 'Adhésion avec droit de vote pour l’adresse au lac :',
		memberPaymentsSectionTitle: 'Historique des paiements',
		memberPaymentsSectionLead: 'Reçus pour l’année d’adhésion en cours, y compris tout don facultatif.',
		memberPaymentsColDate: 'Date',
		memberPaymentsColMethod: 'Mode de paiement',
		memberPaymentsColTotal: 'Total',
		memberPaymentsColMembership: 'Cotisation',
		memberPaymentsColDonation: 'Don',
		memberPaymentsColReference: 'Référence',
		memberPaymentsColNote: 'Note',
		memberPaymentsColRecordNote: 'Note au dossier',
		memberPaymentsEmpty: 'Aucun paiement n’est indiqué pour cette année pour l’instant.',
		memberPaymentMethodStripe: 'Carte',
		memberPaymentMethodEtransfer: 'Virement Interac',
		memberPaymentMethodCheque: 'Chèque',
		memberPaymentMethodCash: 'Comptant',
		memberPaymentMethodUnknown: 'Autre',
		memberActiveBadge: 'Inscrit',
		memberActiveSnapshotHeading: 'Détails de l’adhésion',
		memberActiveSnapshotTypeLabel: 'Type',
		memberActiveSnapshotFeeLabel: 'Cotisation annuelle',
		memberActiveSnapshotFeeComplimentary: 'Gracieuseté',
		memberActivePaymentOverview: '{{count}} paiements au dossier · {{donation}} en dons',
		memberActivePaymentOverviewFeesOnly: '{{count}} paiement(s) au dossier pour cette année',
		memberActivePaymentItemTotal: 'Total',
		memberActivePaymentSplitMembership: 'Cotisation',
		memberActivePaymentSplitDonation: 'Don',
		memberActivePaymentReference: 'Référence',
		memberPaymentSeeDetails: 'Voir les détails',
		statusInactiveTitle: 'Aucune adhésion active pour {{year}}',
		statusInactiveLead:
			'Choisissez un type d’adhésion ci-dessous, puis payez par carte ou choisissez un autre mode de paiement. L’adhésion avec droit de vote exige une adresse au lac dans votre profil.',
		statusInactiveStep1: 'Choisissez l’adhésion avec droit de vote ou associée (sans droit de vote).',
		statusInactiveStep2:
			'Utilisez Payer par carte de crédit (don facultatif dans la fenêtre) ou Autre mode de paiement pour Interac, chèque ou comptant.',
		statusInactiveStep3: 'Votre adhésion devient active lorsque le paiement est reçu ou enregistré par l’association.',
		tierChoiceLegend: 'Type d’adhésion',
		payOtherMethodsBtn: 'Autre mode de paiement',
		statusPendingTitle: 'Votre adhésion {{year}} est en attente de paiement',
		statusPendingLead:
			'Utilisez l’une des options ci-dessous pour payer. Votre adhésion deviendra active lorsque le paiement sera confirmé (en ligne ou par un administrateur).',
		statusPendingDuesCredited: 'Déjà crédité vers la cotisation : {{amount}}.',
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
		checkoutModalNoteHint: '500 caractères maximum.',
		checkoutModalTitle: 'Payer par carte',
		checkoutModalMembershipLabel: 'Adhésion',
		checkoutModalFeeLabel: 'Cotisation',
		checkoutModalDonationLabel: 'Don (facultatif)',
		donationCategoryLabel: 'Catégorie du don',
		donationCategoryEnvironment: 'Environnement',
		donationCategoryRegatta: 'Régate',
		donationCategoryGeneral: 'Général',
		donationCategoryUnspecified: 'Non précisé',
		checkoutModalTotalLabel: 'Total',
		checkoutModalContinue: 'Continuer vers le paiement sécurisé',
		checkoutModalContinuing: 'Redirection…',
		checkoutModalCancel: 'Annuler',
		checkoutErrorGeneric: 'Impossible de démarrer le paiement. Veuillez réessayer.',
		checkoutStripeMisconfigured:
			'Le paiement en ligne n’est pas configuré. Utilisez un autre mode de paiement ou réessayez plus tard.',
		checkoutInvalidDonation: 'Entrez un montant de don valide (0 ou plus, jusqu’à 50 000).',
		checkoutInvalidDonationNote: 'Limitez la note à 500 caractères ou moins.',
		checkoutErrorNothingDue:
			'Aucun solde de cotisation n’est dû pour le moment. En cas de doute, communiquez avec l’association.',
		checkoutSuccessBanner:
			'Merci. Votre paiement a été accepté et votre adhésion est maintenant active.',
		checkoutCancelledBanner: 'Le paiement a été annulé. Vous pouvez réessayer quand vous voulez.',
		checkoutErrorBanner:
			'Nous n’avons pas pu confirmer votre paiement à partir de ce lien. Si le paiement a réussi, votre adhésion sera mise à jour sous peu; sinon, réessayez à partir de cette page.',
		otherPaymentTitle: 'Autres modes de paiement',
		otherPaymentDonationTitle: 'Vous souhaitez contribuer un peu plus ?',
		otherPaymentDonationBody:
			'Vous pouvez ajouter un don supplémentaire à l’ORALB en même temps que votre cotisation. Pour orienter votre don vers un fonds ou un projet précis, indiquez-le dans le message de votre virement Interac ou dans le champ mémo de votre chèque.',
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
			'Complétez votre profil pour ajouter les renseignements de votre foyer à votre dossier, puis vous pourrez acheter une adhésion.',
		profileEditTitle: 'Profil | Association du lac Bernard',
		profileEditDescription: 'Mettez à jour les coordonnées associées à votre dossier.',
		profileEditHeroAria: 'Modifier le profil',
		profileEditHero: 'Votre profil',
		profileSectionContact: 'Coordonnées',
		profileSectionLake: 'Adresse au lac',
		profileSectionPrimaryMember: 'Info du membre',
		profileSectionSecondaryMember: 'Contact secondaire',
		profileShowSecondaryMember: 'Ajouter les coordonnées du contact secondaire',
		profileSectionMailing: 'Adresse postale',
		profileSignInEmail: 'Courriel de connexion',
		profileSectionNamesOnMembership: 'Noms sur l’adhésion',
		profileSecondaryMemberHelp:
			'Vous pouvez ajouter le nom et les coordonnées d’un contact secondaire à votre dossier membre, si vous le souhaitez, à des fins de tenue de dossier.',
		profileLakeHelp:
			'Votre adresse au lac est requise pour une adhésion avec droit de vote. Les membres associés peuvent ignorer cette section.',
		profileLakeDisplayHelp:
			'Voici l’adresse au lac Bernard associée à votre foyer et liée à une adhésion avec droit de vote.',
		profileRequiredFieldsNote: 'Les champs suivis d’une astérisque (*) sont obligatoires.',
		profileOptionalMark: '(facultatif)',
		profileFirstName: 'Prénom',
		profileLastName: 'Nom',
		profileSecondaryFirstName: 'Prénom',
		profileSecondaryLastName: 'Nom',
		profileSecondaryEmail: 'Courriel',
		profilePrimaryPhone: 'Téléphone principal',
		profileSecondaryPhone: 'Téléphone',
		profileLakeCivic: 'Numéro civique',
		profileLakeStreet: 'Rue',
		profileLakeSearchLabel: 'Trouver votre adresse au lac',
		profileLakeSearchPlaceholder: 'Commencez à saisir votre adresse au lac',
		profileLakeManualLink: 'Mon adresse ne figure pas dans la liste',
		profileLakeNoSuggestions: 'Aucune suggestion — essayez la saisie manuelle ci-dessous.',
		profileLakeBackToSearch: 'Chercher une adresse',
		profileStreetAddress: 'Adresse',
		profileCity: 'Ville',
		profileProvince: 'Province / État',
		profileCountry: 'Pays',
		profilePostal: 'Code postal',
		profileEmailOptIn: 'M’envoyer des nouvelles de l’association par courriel (modifiable à tout moment)',
		profileCreateSubmit: 'Créer le profil',
		profileSaveSubmit: 'Enregistrer',
		profileBackToAccount: 'Retour à l’espace membre',
		profileErrorFirstName: 'Le prénom est obligatoire.',
		profileErrorLastName: 'Le nom est obligatoire.',
		profileErrorPrimaryEmail: 'Le courriel de ce compte n’est pas valide. Veuillez nous contacter si le problème persiste.',
		profileErrorSecondaryEmail: 'Entrez un courriel valide pour le contact secondaire.',
		profileErrorSecondaryContact: 'Ajoutez au moins un renseignement pour le contact secondaire ou décochez l’option.',
		profileErrorPhone: 'Entrez un numéro de téléphone valide.',
		profileErrorLakeAddress: 'Entrez le numéro civique et le nom de rue du lac, ou laissez les deux champs vides.',
		profileErrorAlreadyMember: 'Un profil existe déjà pour ce compte. Retour à l’espace membre.',
		profileErrorSave: 'Enregistrement impossible. Veuillez réessayer.',
	},
};

export function membershipTierLabel(tier: string, locale: MemberLocale): string {
	const t = memberCopy[locale];
	if (tier === 'voting' || tier === 'general') return t.tierGeneral;
	if (tier === 'associate') return t.tierAssociate;
	return tier;
}

export function safeMemberNext(path: string | null, locale: MemberLocale): string {
	const fallback = memberPaths[locale].account;
	if (!path) return fallback;
	return path.startsWith('/') && !path.startsWith('//') ? path : fallback;
}

/** Picks `/en/...` or `/fr/...` sign-in from a safe member `next` path (for auth error redirects). */
export function memberSignInPathForNext(next: string): string {
	if (next.startsWith('/en/')) return memberPaths.en.signIn;
	if (next.startsWith('/fr/')) return memberPaths.fr.signIn;
	return defaultMemberSignInPath;
}
