/** Client-side admin console (membership admin page). */

import { escapeHtml } from '../lib/admin/escapeHtml';
import { formatAdminLocaleDate, formatAdminLocaleDateTime } from '../lib/admin/formatLocaleDate';
import { formatAdminRelativeAgo, type AdminRelativeStrings } from '../lib/admin/formatRelativeAgo';
import { initAdminMemberIndex } from './admin-member-index';

export type AdminConsoleStrings = Record<string, string>;

const ADMIN_TAB_IDS = ['overview', 'members', 'auditLog'] as const;
export type AdminTabId = (typeof ADMIN_TAB_IDS)[number];

function isAdminTabId(s: string): s is AdminTabId {
	return (ADMIN_TAB_IDS as readonly string[]).includes(s);
}

/** Valid tab id from `?tab=` on the membership admin page; invalid or missing → overview. */
export function parseAdminTabQueryParam(tabParam: string | null | undefined): AdminTabId {
	const v = tabParam?.trim() ?? '';
	if (v === 'pending') return 'members';
	if (v && isAdminTabId(v)) return v;
	return 'overview';
}

/** Timeline row from GET /api/admin/activity (client shape). */
type ActivityApiTimelineItem =
	| {
			kind: 'payment';
			occurredAt: string;
			memberId: string;
			paymentId: number;
			membershipYear: number;
			tier: string;
			membershipAmount: number | null;
			donationAmount: number | null;
			method: string | null;
			amount: number | null;
			stripeFeeCad?: number | null;
			member: {
				id: string;
				first_name: string | null;
				last_name: string;
				secondary_first_name?: string | null;
				secondary_last_name?: string | null;
				lake_civic_number?: string | null;
				lake_street_name?: string | null;
			};
	  }
	| {
			kind: 'profile_created';
			occurredAt: string;
			memberId: string;
			member: {
				id: string;
				first_name: string | null;
				last_name: string;
				secondary_first_name?: string | null;
				secondary_last_name?: string | null;
				lake_civic_number?: string | null;
				lake_street_name?: string | null;
			};
	  }
	| {
			kind: 'membership_pending';
			occurredAt: string;
			memberId: string;
			membershipId: string;
			year: number;
			tier: string;
			expectedMembershipCents: number | null;
			sumMembershipPaid: number;
			member: {
				id: string;
				first_name: string | null;
				last_name: string;
				secondary_first_name?: string | null;
				secondary_last_name?: string | null;
				lake_civic_number?: string | null;
				lake_street_name?: string | null;
			};
	  };

/** Non-Stripe: banknote / manual payment */
const ADMIN_TIMELINE_ICON_CASH =
	'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7zm3-1a1 1 0 00-1 1v10a1 1 0 001 1h10a1 1 0 001-1V7a1 1 0 00-1-1H7zm5 2.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/></svg>';
/** Stripe: credit card */
const ADMIN_TIMELINE_ICON_CARD =
	'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 7a2 2 0 012-2h12a2 2 0 012 2v2H4V7zm16 4v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7h16zM6 16h4v1H6v-1z"/></svg>';
const ADMIN_TIMELINE_ICON_PROFILE =
	'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';
const ADMIN_TIMELINE_ICON_PENDING =
	'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3h6a2 2 0 012 2v1h1a2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h1V5a2 2 0 012-2zm0 2v1h6V5H9zm-2 4v11h12V9H7zm2 3h8v2H9v-2zm0 4h5v2H9v-2z"/></svg>';

function formatPersonName(first: string | null | undefined, last: string | null | undefined): string {
	const f = (first ?? '').trim();
	const l = (last ?? '').trim();
	if (f && l) return `${f} ${l}`;
	return f || l || '—';
}

function primaryName(m: {
	first_name: string | null;
	last_name: string;
}): string {
	return formatPersonName(m.first_name, m.last_name);
}

function secondaryName(m: {
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
}): string {
	return formatPersonName(m.secondary_first_name ?? null, m.secondary_last_name ?? null);
}

function el<T extends HTMLElement>(sel: string): T | null {
	return document.querySelector(sel) as T | null;
}

function t(strings: AdminConsoleStrings, key: string, vars?: Record<string, string | number>): string {
	let s = strings[key] ?? key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
		}
	}
	return s;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T; status: number }> {
	const headers: Record<string, string> = { ...((init?.headers as Record<string, string>) ?? {}) };
	if (init?.body !== undefined && !headers['Content-Type']) {
		headers['Content-Type'] = 'application/json';
	}
	const res = await fetch(url, { ...init, credentials: 'include', headers });
	let data = null as T;
	try {
		data = (await res.json()) as T;
	} catch {
		/* empty */
	}
	return { ok: res.ok, data: data as T, status: res.status };
}

let statusElGlobal: HTMLElement | null = null;

function setStatusGlobal(strings: AdminConsoleStrings, msg: string, kind: 'neutral' | 'error' | 'success' = 'neutral') {
	if (!statusElGlobal) return;
	if (!msg) {
		statusElGlobal.textContent = '';
		statusElGlobal.removeAttribute('data-error');
		statusElGlobal.removeAttribute('data-success');
		return;
	}
	statusElGlobal.textContent = msg;
	statusElGlobal.dataset.error = kind === 'error' ? '1' : '';
	statusElGlobal.dataset.success = kind === 'success' ? '1' : '';
}

function methodLabel(strings: AdminConsoleStrings, m: string | null): string {
	if (!m) return '—';
	if (m === 'stripe') return t(strings, 'adminMethodStripe');
	if (m === 'e-transfer') return t(strings, 'adminMethodEtransfer');
	if (m === 'cheque') return t(strings, 'adminMethodCheque');
	if (m === 'cash') return t(strings, 'adminMethodCash');
	if (m === 'unknown') return t(strings, 'adminMethodUnknown');
	return m;
}

function formatExpectedMembershipFee(cents: number | null | undefined, numberLocale: string): string {
	if (cents == null) return '—';
	return new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'CAD' }).format(cents / 100);
}

export function initAdminConsole(
	strings: AdminConsoleStrings,
	tierLabels: { voting: string; associate: string },
	defaultMembershipYear: number,
	adminMembersBase: string,
	numberLocale: string = 'en-CA',
	locale: 'en' | 'fr' = 'en',
) {
	const overviewMount = el<HTMLElement>('#admin-overview-mount');
	const auditBody = el<HTMLTableSectionElement>('#admin-audit-body');
	const pendingBadge = el<HTMLElement>('#admin-pending-badge');
	statusElGlobal = el<HTMLElement>('#admin-status');
	const tabs = document.querySelectorAll<HTMLButtonElement>('[data-admin-tab]');
	const panels = document.querySelectorAll<HTMLElement>('[data-admin-panel]');

	const fmtCad = (n: number) =>
		new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'CAD' }).format(n);

	let auditPage = 1;
	let auditTotalPages = 1;

	const ACTIVITY_TIMELINE_LIMIT = 20;
	let activityTimelineNextBefore: string | null = null;
	let renderActivityTimelineRow: ((item: ActivityApiTimelineItem) => string) | null = null;
	let activityTimelineLoadingMore = false;

	function setStatus(msg: string, kind: 'neutral' | 'error' | 'success' = 'neutral') {
		setStatusGlobal(strings, msg, kind);
	}

	/** Must match `counts.pending` from member index + `admin_pending_membership_count` (current year, non-disabled). */
	function setPendingBadge(count: number) {
		if (!pendingBadge) return;
		pendingBadge.textContent = count > 0 ? t(strings, 'adminPendingBadge', { count }) : '';
		pendingBadge.hidden = count <= 0;
	}

	function currentHistoryUrl(): string {
		return `${window.location.pathname}${window.location.search}${window.location.hash}`;
	}

	const memberIndex = initAdminMemberIndex(
		strings,
		tierLabels,
		defaultMembershipYear,
		adminMembersBase,
		locale,
		(msg, kind) => setStatusGlobal(strings, msg, kind ?? 'neutral'),
		currentHistoryUrl,
		(url) => history.pushState({}, '', url),
		(counts) => {
			const n = counts.pending;
			if (typeof n === 'number') setPendingBadge(n);
		},
	);

	function adminTabHistoryUrl(tab: AdminTabId): string {
		const u = new URL(window.location.href);
		if (tab === 'overview') {
			u.searchParams.delete('tab');
			u.searchParams.delete('view');
			u.searchParams.delete('lapsedSince');
			u.searchParams.delete('q');
			u.searchParams.delete('sort');
			u.searchParams.delete('page');
			u.searchParams.delete('includeDisabled');
		} else {
			u.searchParams.set('tab', tab);
		}
		return `${u.pathname}${u.search}${u.hash}`;
	}

	function showTab(name: string, historyMode: 'none' | 'push' = 'push') {
		const tab: AdminTabId = isAdminTabId(name) ? name : 'overview';
		setStatus('');
		tabs.forEach((btn) => {
			const active = btn.dataset.adminTab === tab;
			btn.setAttribute('aria-selected', active ? 'true' : 'false');
		});
		panels.forEach((p) => {
			p.hidden = p.dataset.adminPanel !== tab;
		});

		if (historyMode === 'push') {
			const next = adminTabHistoryUrl(tab);
			if (next !== currentHistoryUrl()) {
				history.pushState({ adminTab: tab }, '', next);
			}
		}

		if (tab === 'members') {
			memberIndex.onMembersTabShown();
		} else if (tab === 'overview') {
			void loadOverview();
		} else if (tab === 'auditLog') {
			void loadAuditLog();
		}
	}

	tabs.forEach((btn) => {
		btn.addEventListener('click', () => showTab(btn.dataset.adminTab ?? 'overview', 'push'));
	});

	window.addEventListener('popstate', () => {
		showTab(parseAdminTabQueryParam(new URLSearchParams(window.location.search).get('tab')), 'none');
	});

	overviewMount?.addEventListener('click', (e) => {
		const moreBtn = (e.target as HTMLElement).closest('#admin-timeline-more');
		if (moreBtn) {
			e.preventDefault();
			void loadMoreActivityTimeline();
			return;
		}
		const nav = (e.target as HTMLElement).closest('[data-admin-kpi-nav]');
		if (nav) {
			const dest = nav.getAttribute('data-admin-kpi-nav');
			const kpiView = nav.getAttribute('data-admin-kpi-view');
			if (dest === 'members') {
				e.preventDefault();
				const u = new URL(window.location.href);
				u.searchParams.set('tab', 'members');
				if (kpiView) u.searchParams.set('view', kpiView);
				else if (!u.searchParams.get('view')) u.searchParams.set('view', 'mailing');
				history.pushState({}, '', `${u.pathname}${u.search}${u.hash}`);
				showTab('members', 'none');
				memberIndex.readUrlState();
				memberIndex.onMembersTabShown();
			}
			return;
		}
		const t = e.target as HTMLElement;
		if (t.closest('a, button')) return;
		const li = t.closest<HTMLElement>('li.adminTimelineRow[data-admin-member-href]');
		if (!li) return;
		const href = li.dataset.adminMemberHref;
		if (href) window.location.assign(href);
	});

	overviewMount?.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		const li = (e.target as HTMLElement).closest<HTMLElement>('li.adminTimelineRow[data-admin-member-href]');
		if (!li || !overviewMount?.contains(li)) return;
		if ((e.target as HTMLElement).closest('a, button')) return;
		e.preventDefault();
		const href = li.dataset.adminMemberHref;
		if (href) window.location.assign(href);
	});

	el<HTMLButtonElement>('#admin-audit-prev')?.addEventListener('click', () => {
		if (auditPage > 1) {
			auditPage--;
			void loadAuditLog();
		}
	});
	el<HTMLButtonElement>('#admin-audit-next')?.addEventListener('click', () => {
		if (auditPage < auditTotalPages) {
			auditPage++;
			void loadAuditLog();
		}
	});

	function auditEntityLabel(entityType: string | null | undefined, entityId: string | null | undefined): string {
		const typeStr = entityType?.trim() ?? '';
		const id = entityId?.trim() ?? '';
		if (typeStr && id) return `${typeStr} · ${id}`;
		if (typeStr) return typeStr;
		if (id) return id;
		return '—';
	}

	function auditMetadataHtml(metadata: unknown): string {
		if (metadata == null) return '—';
		if (typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata) && Object.keys(metadata).length === 0) {
			return '—';
		}
		let text: string;
		try {
			text = typeof metadata === 'string' ? metadata : JSON.stringify(metadata, null, 2);
		} catch {
			text = String(metadata);
		}
		if (!text || text === '{}' || text === 'null') return '—';
		return `<pre class="adminAuditMetadata">${escapeHtml(text)}</pre>`;
	}

	async function loadAuditLog() {
		if (!auditBody) return;
		auditBody.innerHTML = `<tr><td colspan="5">${t(strings, 'adminLoading')}</td></tr>`;
		const { ok, data } = await fetchJson<{
			entries?: Array<{
				id: number;
				created_at: string;
				actor_email?: string | null;
				action: string;
				entity_type?: string | null;
				entity_id?: string | null;
				metadata?: unknown;
			}>;
			total?: number;
			page?: number;
			limit?: number;
			error?: string;
			detail?: string;
		}>(`/api/admin/audit-log?page=${auditPage}&limit=25`);
		if (!ok || !data.entries) {
			auditBody.innerHTML = `<tr><td colspan="5">${escapeHtml(data?.detail ?? data?.error ?? t(strings, 'adminErrorGeneric'))}</td></tr>`;
			return;
		}
		const total = data.total ?? 0;
		const limit = data.limit ?? 25;
		auditTotalPages = Math.max(1, Math.ceil(total / limit));
		const pageInfo = el('#admin-audit-pageinfo');
		if (pageInfo) {
			pageInfo.textContent = t(strings, 'adminPageOf', { page: auditPage, total: auditTotalPages });
		}
		if (data.entries.length === 0) {
			auditBody.innerHTML = `<tr><td colspan="5">${escapeHtml(t(strings, 'adminAuditEmpty'))}</td></tr>`;
			return;
		}
		auditBody.innerHTML = data.entries
			.map((row) => {
				const when = formatAdminLocaleDateTime(row.created_at, numberLocale);
				const actor = row.actor_email?.trim() || '—';
				const entity = auditEntityLabel(row.entity_type, row.entity_id);
				return `<tr>
					<td>${escapeHtml(when)}</td>
					<td>${escapeHtml(actor)}</td>
					<td>${escapeHtml(row.action)}</td>
					<td>${escapeHtml(entity)}</td>
					<td class="adminAuditTdMetadata">${auditMetadataHtml(row.metadata)}</td>
				</tr>`;
			})
			.join('');
	}

	function overviewTierLabel(raw: string | null | undefined): string {
		if (raw == null || raw === '') return '—';
		if (raw === 'voting' || raw === 'general') return tierLabels.voting;
		if (raw === 'associate') return tierLabels.associate;
		return raw;
	}

	function hasSecondaryNameParts(m: {
		secondary_first_name?: string | null;
		secondary_last_name?: string | null;
	}): boolean {
		return (m.secondary_first_name ?? '').trim().length > 0 || (m.secondary_last_name ?? '').trim().length > 0;
	}

	function timelineMemberNameLine(m: {
		first_name: string | null;
		last_name: string;
		secondary_first_name?: string | null;
		secondary_last_name?: string | null;
	}): string {
		const p = primaryName(m);
		if (!hasSecondaryNameParts(m)) return p;
		const s = formatPersonName(m.secondary_first_name ?? null, m.secondary_last_name ?? null);
		if (!s || s === '—') return p;
		return `${p} & ${s}`;
	}

	function timelineLakeLineForTier(
		tierRaw: string | null | undefined,
		civic: string | null | undefined,
		street: string | null | undefined,
	): string {
		const t = (tierRaw ?? '').trim();
		const c = (civic ?? '').trim();
		const s = (street ?? '').trim();
		if (t === 'associate') {
			if (c && s) return `${c} ${s}`;
			return '';
		}
		if (!c && !s) return '—';
		if (c && s) return `${c} ${s}`;
		return '—';
	}

	function timelineProfileAddressLine(civic: string | null | undefined, street: string | null | undefined): string | null {
		const c = (civic ?? '').trim();
		const s = (street ?? '').trim();
		if (!c && !s) return null;
		return [c, s].filter(Boolean).join(' ');
	}

	function memberRowOpenAttrs(
		mem: {
			id: string;
			first_name: string | null;
			last_name: string;
			secondary_first_name?: string | null;
			secondary_last_name?: string | null;
		},
		displayName?: string,
	): string {
		const href = `${adminMembersBase}/${encodeURIComponent(mem.id)}`;
		const name = displayName ?? primaryName(mem);
		const rowLabel = `${t(strings, 'adminMemberOpen')}: ${name}`;
		return ` data-admin-member-href="${escapeHtml(href)}" tabindex="0" role="link" aria-label="${escapeHtml(rowLabel)}"`;
	}

	/** Tab badge (pending) normally comes from `loadOverview`; call when opening a non-overview tab first (e.g. deep link). */
	async function loadActivityTabBadges() {
		const { ok, data } = await fetchJson<{
			counts?: {
				pendingMemberships: number;
			};
			error?: string;
		}>('/api/admin/activity');
		if (!ok) return;
		const c = data.counts;
		if (!c) return;
		setPendingBadge(c.pendingMemberships);
	}

	function updateActivityTimelineMoreButton(pagination?: { hasMore: boolean; nextBefore: string | null } | null) {
		const show = Boolean(pagination?.hasMore && pagination?.nextBefore);
		activityTimelineNextBefore = show ? pagination?.nextBefore ?? null : null;
		const btn = el<HTMLButtonElement>('#admin-timeline-more');
		if (btn) btn.hidden = !show;
	}

	async function loadMoreActivityTimeline() {
		if (!overviewMount || !renderActivityTimelineRow || activityTimelineLoadingMore) return;
		if (!activityTimelineNextBefore) return;
		activityTimelineLoadingMore = true;
		const btn = el<HTMLButtonElement>('#admin-timeline-more');
		if (btn) {
			btn.disabled = true;
			btn.setAttribute('aria-busy', 'true');
		}
		try {
			const qs = new URLSearchParams();
			qs.set('limit', String(ACTIVITY_TIMELINE_LIMIT));
			qs.set('before', activityTimelineNextBefore);
			const { ok, data } = await fetchJson<{
				timeline?: ActivityApiTimelineItem[];
				pagination?: { limit: number; hasMore: boolean; nextBefore: string | null };
				error?: string;
			}>(`/api/admin/activity?${qs.toString()}`);
			if (!ok || !data.timeline) {
				setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			const ul = el<HTMLUListElement>('#admin-timeline-list');
			if (!ul) return;
			ul.insertAdjacentHTML('beforeend', data.timeline.map((item) => renderActivityTimelineRow!(item)).join(''));
			updateActivityTimelineMoreButton(data.pagination ?? null);
		} finally {
			activityTimelineLoadingMore = false;
			if (btn) {
				btn.disabled = false;
				btn.removeAttribute('aria-busy');
			}
		}
	}

	async function loadOverview() {
		if (!overviewMount) return;
		overviewMount.innerHTML = `<p class="adminHint">${t(strings, 'adminLoading')}</p>`;
		activityTimelineNextBefore = null;
		renderActivityTimelineRow = null;

		const qs = new URLSearchParams();
		qs.set('limit', String(ACTIVITY_TIMELINE_LIMIT));

		const { ok, data } = await fetchJson<{
			timeline?: ActivityApiTimelineItem[];
			counts?: {
				pendingMemberships: number;
				activeForYear: number;
				membershipYear: number;
				membersCreatedLastSevenDays: number;
			};
			pagination?: { limit: number; hasMore: boolean; nextBefore: string | null };
			error?: string;
		}>(`/api/admin/activity?${qs.toString()}`);
		if (!ok) {
			overviewMount.innerHTML = `<p class="adminHint">${data?.error ?? t(strings, 'adminErrorGeneric')}</p>`;
			return;
		}
		const c = data.counts;
		if (c) {
			setPendingBadge(c.pendingMemberships);
		}

		const relativeStrings: AdminRelativeStrings = {
			justNow: t(strings, 'adminRelativeJustNow'),
			minAgo: t(strings, 'adminRelativeMinAgo'),
			hrAgo: t(strings, 'adminRelativeHrAgo'),
			hrsAgo: t(strings, 'adminRelativeHrsAgo'),
			yesterday: t(strings, 'adminRelativeYesterday'),
			daysAgo: t(strings, 'adminRelativeDaysAgo'),
			weeksAgo: t(strings, 'adminRelativeWeeksAgo'),
		};

		function buildTimelineRow(item: ActivityApiTimelineItem): string {
			const m = item.member;
			const nameLine = timelineMemberNameLine(m);
			const whenTitle = formatAdminLocaleDateTime(item.occurredAt, numberLocale);
			const rel = formatAdminRelativeAgo(item.occurredAt, relativeStrings);
			let rowVariant: 'cash' | 'card' | 'profile' | 'pending' = 'pending';
			let eventLabel = '';
			let iconWrap = '';
			let line2 = '';

			if (item.kind === 'payment') {
				const isStripe = (item.method ?? '').trim() === 'stripe';
				if (isStripe) {
					rowVariant = 'card';
					eventLabel = t(strings, 'adminTimelineLabelCardPayment');
					iconWrap = `<span class="adminTimelineIconWrap adminTimelineIconWrap--card">${ADMIN_TIMELINE_ICON_CARD}</span>`;
				} else {
					rowVariant = 'cash';
					eventLabel = t(strings, 'adminTimelineLabelPaymentRecorded');
					iconWrap = `<span class="adminTimelineIconWrap adminTimelineIconWrap--cash">${ADMIN_TIMELINE_ICON_CASH}</span>`;
				}
				const parts: string[] = [];
				parts.push(overviewTierLabel(item.tier));
				const lake = timelineLakeLineForTier(item.tier, m.lake_civic_number, m.lake_street_name);
				if (lake) parts.push(lake);
				const duesNum =
					item.membershipAmount != null && Number.isFinite(Number(item.membershipAmount)) ?
						Number(item.membershipAmount)
					: item.amount != null && Number.isFinite(Number(item.amount)) ?
						Number(item.amount)
					:	null;
				if (duesNum != null && Math.abs(duesNum) > 0.001) {
					parts.push(`${t(strings, 'adminTableDuesPortion')} ${fmtCad(duesNum)}`);
				}
				const don = item.donationAmount ?? 0;
				if (don > 0.001) {
					parts.push(`${t(strings, 'adminTableDonationPortion')} ${fmtCad(don)}`);
				}
				const fee =
					item.stripeFeeCad != null && Number.isFinite(Number(item.stripeFeeCad)) ?
						Number(item.stripeFeeCad)
					:	null;
				if (isStripe && fee != null && fee > 0.0005) {
					parts.push(t(strings, 'adminTimelineStripeFee', { amount: fmtCad(fee) }));
				}
				parts.push(methodLabel(strings, item.method));
				line2 = parts.join(' · ');
			} else if (item.kind === 'profile_created') {
				rowVariant = 'profile';
				eventLabel = t(strings, 'adminTimelineLabelProfileCreated');
				iconWrap = `<span class="adminTimelineIconWrap adminTimelineIconWrap--profile">${ADMIN_TIMELINE_ICON_PROFILE}</span>`;
				const addr = timelineProfileAddressLine(m.lake_civic_number, m.lake_street_name);
				if (addr) line2 = addr;
			} else {
				rowVariant = 'pending';
				eventLabel = t(strings, 'adminTimelineLabelMembershipPending');
				iconWrap = `<span class="adminTimelineIconWrap adminTimelineIconWrap--pending">${ADMIN_TIMELINE_ICON_PENDING}</span>`;
				const parts: string[] = [];
				parts.push(overviewTierLabel(item.tier));
				const lake = timelineLakeLineForTier(item.tier, m.lake_civic_number, m.lake_street_name);
				if (lake) parts.push(lake);
				parts.push(
					`${t(strings, 'adminTableExpectedFee')} ${formatExpectedMembershipFee(item.expectedMembershipCents, numberLocale)}`,
				);
				if (item.sumMembershipPaid > 0.001) {
					parts.push(t(strings, 'adminTimelinePendingPaidPortion', { amount: fmtCad(item.sumMembershipPaid) }));
				}
				line2 = parts.join(' · ');
			}

			const headTitle = `${eventLabel} — ${nameLine}`;
			const line2Html = line2 ? `<div class="adminTimelineLine2">${escapeHtml(line2)}</div>` : '';
			return `<li class="adminTimelineRow adminTimelineRow--${rowVariant}"${memberRowOpenAttrs(m, headTitle)}>
				${iconWrap}
				<div class="adminTimelineBody">
					<div class="adminTimelineHead">
						<span class="adminTimelineEventLabel">${escapeHtml(eventLabel)}</span>
						<span class="adminTimelineSep" aria-hidden="true"> — </span>
						<span class="adminTimelineName">${escapeHtml(nameLine)}</span>
					</div>
					${line2Html}
				</div>
				<time class="adminTimelineWhen" datetime="${escapeHtml(item.occurredAt)}" title="${escapeHtml(whenTitle)}">${escapeHtml(rel)}</time>
			</li>`;
		}

		renderActivityTimelineRow = buildTimelineRow;

		const items = data.timeline ?? [];
		const pagination = data.pagination ?? null;

		const timelineInner =
			items.length === 0 ?
				`<p class="adminTimelineEmpty">${escapeHtml(t(strings, 'adminTimelineEmpty'))}</p>`
			:	`<ul id="admin-timeline-list" class="adminTimeline" role="list">${items.map(buildTimelineRow).join('')}</ul>`;

		const loadMoreBtn = `<div class="adminTimelineFooter">
			<button type="button" id="admin-timeline-more" class="adminBtn adminBtn--outline" hidden aria-busy="false">${escapeHtml(t(strings, 'adminTimelineLoadMore'))}</button>
		</div>`;

		const timelineList = `<div class="adminTimelineWrap">${timelineInner}${items.length > 0 ? loadMoreBtn : ''}</div>`;

		const kpi =
			c ?
				`<div class="adminKpiSection" role="region">
				<div class="adminKpiYearRow">
					<span class="adminKpiYearLabel">${escapeHtml(t(strings, 'adminKpiCurrentYearLabel'))}</span>
					<span class="adminKpiYearNumber">${c.membershipYear}</span>
				</div>
				<div class="adminKpiRow adminKpiRow--three">
				<button type="button" class="adminKpi adminKpi--activeYear" data-admin-kpi-nav="members"
					aria-label="${escapeHtml(t(strings, 'adminOverviewKpiAriaMembers', { count: c.activeForYear, year: c.membershipYear }))}"><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminKpiActiveMembershipsLabel'))}</span><span class="adminKpiValue">${c.activeForYear}</span></button>
				<button type="button" class="adminKpi adminKpi--pending" data-admin-kpi-nav="members" data-admin-kpi-view="pending"
					aria-label="${escapeHtml(t(strings, 'adminOverviewKpiAriaPending', { count: c.pendingMemberships }))}"><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminKpiPendingPaymentsLabel'))}</span><span class="adminKpiValue">${c.pendingMemberships}</span></button>
				<div class="adminKpi adminKpi--yesterday"
					aria-label="${escapeHtml(t(strings, 'adminKpiAriaNewMembersLast7Days', { count: c.membersCreatedLastSevenDays }))}"><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminKpiNewMembersLast7DaysLabel'))}</span><span class="adminKpiValue">${c.membersCreatedLastSevenDays}</span></div>
			</div></div>`
			:	'';

		overviewMount.innerHTML = `
			${kpi}
			<section class="adminOverviewSection" aria-labelledby="admin-activity-heading">
			<h3 id="admin-activity-heading" class="adminOverviewHeading">${escapeHtml(t(strings, 'adminOverviewActivityTitle'))}</h3>
			${timelineList}
			</section>
		`;
		updateActivityTimelineMoreButton(pagination);
	}

	const spInit = new URLSearchParams(window.location.search);
	const rawTabParam = spInit.get('tab');
	const tabNormalized = rawTabParam === 'pending' ? 'members' : rawTabParam;
	if (tabNormalized !== null && tabNormalized !== '' && !isAdminTabId(tabNormalized)) {
		history.replaceState(null, '', adminTabHistoryUrl('overview'));
	}

	const initialTab = parseAdminTabQueryParam(new URLSearchParams(window.location.search).get('tab'));
	showTab(initialTab, 'none');
	if (initialTab !== 'overview') {
		void loadActivityTabBadges();
	}
}

