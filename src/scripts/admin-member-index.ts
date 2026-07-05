/** Member directory tab: named views, search, table, exports (membership admin). */

import { escapeHtml } from '../lib/admin/escapeHtml';

export type MemberIndexView = 'voting' | 'associate' | 'mailing' | 'pending' | 'lapsed' | 'incomplete' | 'all';

type AdminStrings = Record<string, string>;

type MemberIndexApiRow = {
	id: string;
	created_at: string;
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
	primary_email: string | null;
	secondary_email: string | null;
	email_opt_in: boolean;
	lake_civic_number: string | null;
	lake_street_name: string | null;
	lake_formatted_address: string | null;
	status: string;
	membership_tier_for_year: string | null;
	membership_status_for_year: string | null;
	last_active_year: number | null;
	since_ym: string;
};

type IndexPayload = {
	members?: MemberIndexApiRow[];
	total?: number;
	page?: number;
	limit?: number;
	index?: {
		view: MemberIndexView;
		year: number;
		lapsedSince: number;
		counts: Record<string, number>;
		emailOptInCount: number | null;
		searchDisabledMatches: number;
	};
	error?: string;
};

function el<T extends HTMLElement>(sel: string): T | null {
	return document.querySelector(sel) as T | null;
}

function t(strings: AdminStrings, key: string, vars?: Record<string, string | number>): string {
	let s = strings[key] ?? key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			s = s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
		}
	}
	return s;
}

function formatPersonName(first: string | null | undefined, last: string | null | undefined): string {
	const f = (first ?? '').trim();
	const l = (last ?? '').trim();
	if (f && l) return `${f} ${l}`;
	return f || l || '—';
}

function primaryName(m: { first_name: string | null; last_name: string }): string {
	return formatPersonName(m.first_name, m.last_name);
}

function secondaryName(m: {
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
}): string {
	return formatPersonName(m.secondary_first_name ?? null, m.secondary_last_name ?? null);
}

function lakeLine(m: MemberIndexApiRow): string {
	const f = (m.lake_formatted_address ?? '').trim();
	if (f) return f;
	const c = (m.lake_civic_number ?? '').trim();
	const s = (m.lake_street_name ?? '').trim();
	if (!c && !s) return '—';
	return [c, s].filter(Boolean).join(' ');
}

function primaryMemberCellHtml(m: MemberIndexApiRow, strings: AdminStrings): string {
	const nameText = primaryName(m);
	const dis = m.status === 'disabled';
	const nameLineHtml = dis
		? `${escapeHtml(nameText)} <span class="adminMemberIndexDisabledBadge">${escapeHtml(t(strings, 'adminStatusBadgeDisabled'))}</span>`
		: escapeHtml(nameText);

	const emailRaw = (m.primary_email ?? '').trim();
	if (!emailRaw) {
		return `<div class="adminMemberIndexMemberStack"><div class="adminMemberIndexMemberName">${nameLineHtml}</div></div>`;
	}
	const emailMuted = !m.email_opt_in;
	const emailLineHtml = `${emailMuted ? `<span class="adminMemberIndexEmailOptOutDot" title="${escapeHtml(t(strings, 'adminEmailOptOutDotAria'))}"></span>` : ''}<span class="adminMemberIndexEmailAddr">${escapeHtml(emailRaw)}</span>`;
	return `<div class="adminMemberIndexMemberStack"><div class="adminMemberIndexMemberName">${nameLineHtml}</div><div class="adminMemberIndexMemberEmail">${emailLineHtml}</div></div>`;
}

function secondaryContactCellHtml(m: MemberIndexApiRow): string {
	const secName = secondaryName(m);
	const hasName = secName !== '—';
	const secEmail = (m.secondary_email ?? '').trim();
	const hasEmail = secEmail.length > 0;
	if (!hasName && !hasEmail) {
		return '<span class="adminMemberIndexSecondaryEmpty">—</span>';
	}
	if (hasName && hasEmail) {
		return `<div class="adminMemberIndexSecondaryStack"><div class="adminMemberIndexSecondaryName">${escapeHtml(secName)}</div><div class="adminMemberIndexSecondaryEmail">${escapeHtml(secEmail)}</div></div>`;
	}
	if (hasName) {
		return `<div class="adminMemberIndexSecondaryStack"><div class="adminMemberIndexSecondaryName">${escapeHtml(secName)}</div></div>`;
	}
	return `<div class="adminMemberIndexSecondaryStack"><div class="adminMemberIndexSecondaryEmail">${escapeHtml(secEmail)}</div></div>`;
}

function viewLabel(strings: AdminStrings, view: MemberIndexView): string {
	switch (view) {
		case 'voting':
			return t(strings, 'adminViewVoting');
		case 'associate':
			return t(strings, 'adminViewAssociate');
		case 'mailing':
			return t(strings, 'adminViewMailing');
		case 'pending':
			return t(strings, 'adminViewPending');
		case 'lapsed':
			return t(strings, 'adminViewLapsed');
		case 'incomplete':
			return t(strings, 'adminViewIncomplete');
		case 'all':
			return t(strings, 'adminViewAll');
		default:
			return view;
	}
}

function defaultSortForView(view: MemberIndexView): string {
	return view === 'incomplete' ? 'created_at_desc' : 'last_name_asc';
}

export function initAdminMemberIndex(
	strings: AdminStrings,
	tierLabels: { voting: string; associate: string },
	defaultMembershipYear: number,
	adminMembersBase: string,
	locale: 'en' | 'fr',
	setStatus: (msg: string, kind?: 'neutral' | 'error' | 'success') => void,
	getHistoryUrl: () => string,
	pushHistoryUrl: (url: string) => void,
	/** Keeps `#admin-pending-badge` in sync with `counts.pending` from this API (same rule as activity KPI / `admin_pending_membership_count`). */
	onIndexCounts?: (counts: Record<string, number>) => void,
) {
	let currentView: MemberIndexView = 'mailing';
	let lapsedSince = defaultMembershipYear - 1;
	let membersPage = 1;
	let membersTotalPages = 1;
	let membersSort = 'last_name_asc';
	let includeDisabled = false;
	let lastCounts: Record<string, number> = {};
	let lastEmailOptIn: number | null = null;
	let lastSearchDisabledMatches = 0;
	/** Bumps on each `loadMembers` start; stale completions must not clear loading or overwrite DOM. */
	let membersLoadGeneration = 0;

	const searchInput = el<HTMLInputElement>('#admin-member-index-q');
	const sortSelect = el<HTMLSelectElement>('#admin-member-index-sort');
	const includeDisabledEl = el<HTMLInputElement>('#admin-member-index-include-disabled');
	const lapsedRow = el<HTMLElement>('#admin-member-lapsed-row');
	const lapsedSelect = el<HTMLSelectElement>('#admin-member-lapsed-since');
	const body = el<HTMLTableSectionElement>('#admin-member-index-body');
	const metaLeft = el<HTMLElement>('#admin-member-meta-left');
	const metaOptIn = el<HTMLElement>('#admin-member-meta-optin');
	const copyBtn = el<HTMLButtonElement>('#admin-member-copy-emails');
	const exportBtn = el<HTMLButtonElement>('#admin-member-export-csv');
	const pageInfo = el<HTMLElement>('#admin-member-pageinfo');
	const prevBtn = el<HTMLButtonElement>('#admin-member-prev');
	const nextBtn = el<HTMLButtonElement>('#admin-member-next');
	const emptyEl = el<HTMLElement>('#admin-member-index-empty');
	const tableWrap = el<HTMLElement>('#admin-member-index-table-wrap');
	const pillsRoot = el<HTMLElement>('#admin-member-view-pills');
	const viewDescEl = el<HTMLElement>('#admin-member-view-desc');
	const searchDisabledNudge = el<HTMLElement>('#admin-member-search-disabled-nudge');

	let searchDebounce: ReturnType<typeof setTimeout> | null = null;

	function readUrlState(): void {
		const sp = new URLSearchParams(window.location.search);
		const v = (sp.get('view') ?? 'mailing').trim().toLowerCase();
		if (
			v === 'voting' ||
			v === 'associate' ||
			v === 'mailing' ||
			v === 'pending' ||
			v === 'lapsed' ||
			v === 'incomplete' ||
			v === 'all'
		) {
			currentView = v;
		} else {
			currentView = 'mailing';
		}
		const ly = parseInt(sp.get('lapsedSince') ?? '', 10);
		if (Number.isFinite(ly)) lapsedSince = ly;
		includeDisabled = sp.get('includeDisabled') === '1' || sp.get('includeDisabled') === 'true';
		if (includeDisabledEl) includeDisabledEl.checked = includeDisabled;
		const sortRaw = sp.get('sort') ?? '';
		if (sortRaw) membersSort = sortRaw;
		else membersSort = defaultSortForView(currentView);
		if (sortSelect) sortSelect.value = membersSort;
		const pg = parseInt(sp.get('page') ?? '1', 10);
		membersPage = Number.isFinite(pg) && pg > 0 ? pg : 1;
		if (searchInput && sp.get('q')) searchInput.value = sp.get('q') ?? '';
		if (lapsedSelect) lapsedSelect.value = String(lapsedSince);
	}

	function buildListParams(forPage: number): URLSearchParams {
		const p = new URLSearchParams();
		p.set('view', currentView);
		p.set('year', String(defaultMembershipYear));
		p.set('lapsedSince', String(lapsedSince));
		if (includeDisabled) p.set('includeDisabled', '1');
		const q = searchInput?.value.trim() ?? '';
		if (q) p.set('q', q);
		p.set('sort', membersSort);
		p.set('page', String(forPage));
		p.set('limit', '25');
		return p;
	}

	function syncUrlFromState(push: boolean) {
		const u = new URL(window.location.href);
		u.searchParams.set('tab', 'members');
		u.searchParams.set('view', currentView);
		u.searchParams.set('lapsedSince', String(lapsedSince));
		if (includeDisabled) u.searchParams.set('includeDisabled', '1');
		else u.searchParams.delete('includeDisabled');
		const q = searchInput?.value.trim() ?? '';
		if (q) u.searchParams.set('q', q);
		else u.searchParams.delete('q');
		u.searchParams.set('sort', membersSort);
		u.searchParams.set('page', String(membersPage));
		const next = `${u.pathname}${u.search}${u.hash}`;
		if (push && next !== getHistoryUrl()) pushHistoryUrl(next);
	}

	function tierLabel(raw: string | null): string {
		if (raw == null || raw === '') return '—';
		if (raw === 'voting') return tierLabels.voting;
		if (raw === 'associate') return tierLabels.associate;
		return raw;
	}

	function updateMailingViewDescription() {
		if (!viewDescEl) return;
		if (currentView === 'mailing') {
			viewDescEl.hidden = false;
			viewDescEl.textContent = t(strings, 'adminMemberIndexViewDescMailing', {
				year: defaultMembershipYear,
			});
		} else {
			viewDescEl.hidden = true;
			viewDescEl.textContent = '';
		}
	}

	function renderPills() {
		if (!pillsRoot) return;
		updateMailingViewDescription();
		const views: MemberIndexView[] = ['voting', 'associate', 'mailing', 'pending', 'lapsed', 'incomplete', 'all'];
		const q = searchInput?.value.trim() ?? '';
		const searchActive = q.length > 0;
		pillsRoot.classList.toggle('adminMemberIndexPills--searchActive', searchActive);

		pillsRoot.innerHTML = views
			.map((v) => {
				const count = lastCounts[v] ?? 0;
				const label = viewLabel(strings, v);
				const active = !searchActive && currentView === v;
				const pendingHighlight = v === 'pending' && count > 0;
				const cls = [
					'adminMemberIndexPill',
					active ? 'adminMemberIndexPill--active' : '',
					pendingHighlight ? 'adminMemberIndexPill--pendingAlert' : '',
				]
					.filter(Boolean)
					.join(' ');
				return `<button type="button" class="${cls}" style="border-radius:999px" data-member-view="${v}" aria-pressed="${active ? 'true' : 'false'}">${escapeHtml(label)} <span class="adminMemberIndexPill__count">${count}</span></button>`;
			})
			.join('');

		pillsRoot.querySelectorAll<HTMLButtonElement>('[data-member-view]').forEach((btn) => {
			btn.addEventListener('click', () => {
				const v = btn.dataset.memberView as MemberIndexView;
				if (!v) return;
				if (searchDebounce) {
					clearTimeout(searchDebounce);
					searchDebounce = null;
				}
				currentView = v;
				membersPage = 1;
				membersSort = defaultSortForView(currentView);
				if (sortSelect) sortSelect.value = membersSort;
				syncUrlFromState(true);
				void loadMembers();
			});
		});
	}

	function metaLeftHtml(total: number, searchActive: boolean): string {
		if (searchActive) {
			return escapeHtml(t(strings, 'adminMemberIndexMetaSearch', { count: total }));
		}
		switch (currentView) {
			case 'voting':
				return escapeHtml(t(strings, 'adminMemberIndexMetaVoting', { count: total }));
			case 'associate':
				return escapeHtml(t(strings, 'adminMemberIndexMetaAssociate', { count: total }));
			case 'mailing':
				return escapeHtml(t(strings, 'adminMemberIndexMetaMailing', { count: total }));
			case 'pending':
				return escapeHtml(t(strings, 'adminMemberIndexMetaPending', { count: total }));
			case 'lapsed':
				return escapeHtml(t(strings, 'adminMemberIndexMetaLapsed', { count: total }));
			case 'incomplete':
				return escapeHtml(t(strings, 'adminMemberIndexMetaIncomplete', { count: total }));
			case 'all':
				return escapeHtml(t(strings, 'adminMemberIndexMetaAll', { count: total }));
			default:
				return String(total);
		}
	}

	function refreshCopyExportLabels(total: number) {
		const mailingOrLapsed = currentView === 'mailing' || currentView === 'lapsed';
		const optInLabel = mailingOrLapsed ? t(strings, 'adminCopyEmailListOptIn') : t(strings, 'adminExportEmails');
		if (copyBtn) copyBtn.textContent = optInLabel;
		if (exportBtn) exportBtn.textContent = t(strings, 'adminExportCsvRows', { count: total });
	}

	function showEmptyState(total: number, searchActive: boolean, query: string) {
		if (!emptyEl) return;
		let msg = '';
		if (searchActive) {
			msg = t(strings, 'adminSearchNoResults', { query });
			if (
				total === 0 &&
				lastSearchDisabledMatches > 0 &&
				!includeDisabled &&
				searchDisabledNudge
			) {
				searchDisabledNudge.hidden = false;
				searchDisabledNudge.innerHTML = `${escapeHtml(t(strings, 'adminSearchTryDisabled'))}<button type="button" class="adminBtn adminBtn--link" id="admin-member-enable-disabled-link">${escapeHtml(t(strings, 'adminSearchTryDisabledLink'))}</button>`;
				el<HTMLButtonElement>('#admin-member-enable-disabled-link')?.addEventListener('click', () => {
					includeDisabled = true;
					if (includeDisabledEl) includeDisabledEl.checked = true;
					syncUrlFromState(true);
					void loadMembers();
				});
			} else if (searchDisabledNudge) {
				searchDisabledNudge.hidden = true;
				searchDisabledNudge.innerHTML = '';
			}
		} else {
			if (searchDisabledNudge) {
				searchDisabledNudge.hidden = true;
				searchDisabledNudge.innerHTML = '';
			}
			const y = defaultMembershipYear;
			switch (currentView) {
				case 'voting':
					msg = t(strings, 'adminEmptyVoting', { year: y });
					break;
				case 'associate':
					msg = t(strings, 'adminEmptyAssociate', { year: y });
					break;
				case 'mailing':
					msg = t(strings, 'adminEmptyMailing', { year: y });
					break;
				case 'pending':
					msg = t(strings, 'adminEmptyPending');
					break;
				case 'lapsed':
					msg = t(strings, 'adminEmptyLapsed', { year: lapsedSince });
					break;
				case 'incomplete':
					msg = t(strings, 'adminEmptyIncomplete');
					break;
				case 'all':
					msg = t(strings, 'adminEmptyAll');
					break;
				default:
					msg = '';
			}
		}
		emptyEl.innerHTML = msg ? `<p>${escapeHtml(msg)}</p>` : '';
		emptyEl.hidden = total > 0 || !msg;
		if (tableWrap) tableWrap.hidden = total === 0 && !!msg;
	}

	async function loadMembers() {
		if (!body || !tableWrap) return;
		const gen = ++membersLoadGeneration;
		const params = buildListParams(membersPage);
		const q = searchInput?.value.trim() ?? '';
		const searchActive = q.length > 0;

		if (lapsedRow) {
			lapsedRow.classList.toggle('adminMemberIndexLapsedRow--visible', currentView === 'lapsed' && !searchActive);
		}
		tableWrap.classList.add('adminMemberIndexTableWrap--membersLoading');
		if (emptyEl) emptyEl.hidden = true;
		tableWrap.hidden = false;

		try {
			const res = await fetch(`/api/admin/members?${params.toString()}`, { credentials: 'include' });
			if (gen !== membersLoadGeneration) return;

			let data: IndexPayload;
			try {
				data = (await res.json()) as IndexPayload;
			} catch {
				if (gen !== membersLoadGeneration) return;
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			if (gen !== membersLoadGeneration) return;

			if (!res.ok || !data.members) {
				body.innerHTML = `<tr><td colspan="5">${escapeHtml(data?.error ?? t(strings, 'adminErrorGeneric'))}</td></tr>`;
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}

			if (gen !== membersLoadGeneration) return;

			setStatus('');

			const idx = data.index;
			if (idx?.counts) {
				lastCounts = idx.counts;
				onIndexCounts?.(idx.counts);
			}
			lastEmailOptIn = idx?.emailOptInCount ?? null;
			lastSearchDisabledMatches = idx?.searchDisabledMatches ?? 0;

			const total = data.total ?? 0;
			const limit = data.limit ?? 25;
			membersTotalPages = Math.max(1, Math.ceil(total / limit));

			if (metaLeft) metaLeft.innerHTML = metaLeftHtml(total, searchActive);
			if (metaOptIn) {
				const optInCount = lastEmailOptIn;
				const showOptIn =
					!searchActive &&
					(currentView === 'mailing' || currentView === 'lapsed') &&
					optInCount != null;
				if (showOptIn) {
					metaOptIn.hidden = false;
					metaOptIn.textContent = t(strings, 'adminMemberIndexEmailOptInAppend', {
						count: optInCount,
					});
				} else {
					metaOptIn.hidden = true;
					metaOptIn.textContent = '';
				}
			}

			refreshCopyExportLabels(total);
			renderPills();

			if (pageInfo) pageInfo.textContent = t(strings, 'adminPageOf', { page: membersPage, total: membersTotalPages });
			if (prevBtn) prevBtn.disabled = membersPage <= 1;
			if (nextBtn) nextBtn.disabled = membersPage >= membersTotalPages;

			showEmptyState(total, searchActive, q);

			const showLastActive = currentView === 'lapsed' && !searchActive;
			const sinceTh = el<HTMLElement>('#admin-member-index-since-th');
			if (sinceTh) {
				sinceTh.textContent = showLastActive ? t(strings, 'adminTableColLastActive') : t(strings, 'adminTableColSince');
			}

			if (total === 0) {
				body.innerHTML = '';
				return;
			}

			body.innerHTML = data.members
				.map((m) => {
					const href = `${adminMembersBase}/${encodeURIComponent(m.id)}`;
					const nameText = primaryName(m);
					const dis = m.status === 'disabled';

					const tier = tierLabel(m.membership_tier_for_year);
					const tierRaw = (m.membership_tier_for_year ?? '').trim();
					const tierClass =
						tierRaw === 'associate' ? 'adminMemberIndexTierBadge--associate'
						: tierRaw === 'voting' ? 'adminMemberIndexTierBadge--voting'
						: 'adminMemberIndexTierBadge--empty';

					const sinceOrLast = showLastActive ?
						m.last_active_year != null ?
							String(m.last_active_year)
						:	'—'
					:	m.since_ym || '—';

					const rowDis = dis ? ' adminMemberIndexRow--disabled' : '';
					const rowLabel = `${t(strings, 'adminMemberOpen')}: ${nameText}`;

					return `<tr class="adminMemberIndexRow${rowDis}" data-admin-member-href="${escapeHtml(href)}" tabindex="0" role="link" aria-label="${escapeHtml(rowLabel)}">
					<td class="adminMemberIndexColMember">${primaryMemberCellHtml(m, strings)}</td>
					<td class="adminMemberIndexColSecondary">${secondaryContactCellHtml(m)}</td>
					<td class="adminMemberIndexColLake">${escapeHtml(lakeLine(m))}</td>
					<td class="adminMemberIndexColType"><span class="adminMemberIndexTierBadge ${tierClass}">${escapeHtml(tier)}</span></td>
					<td class="adminMemberIndexColSince"><span class="adminMemberIndexSinceText">${escapeHtml(sinceOrLast)}</span><span class="adminMemberIndexRowChevron" aria-hidden="true">›</span></td>
				</tr>`;
				})
				.join('');

			body.querySelectorAll<HTMLElement>('[data-admin-member-href]').forEach((row) => {
				const go = () => {
					const href = row.dataset.adminMemberHref;
					if (href) window.location.assign(href);
				};
				row.addEventListener('click', (e) => {
					if ((e.target as HTMLElement).closest('a, button')) return;
					go();
				});
				row.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						go();
					}
				});
			});
		} catch {
			if (gen === membersLoadGeneration) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
			}
		} finally {
			if (gen === membersLoadGeneration) {
				tableWrap.classList.remove('adminMemberIndexTableWrap--membersLoading');
				void tableWrap.offsetHeight;
			}
		}
	}

	function buildExportParams(): URLSearchParams {
		const p = buildListParams(1);
		p.delete('page');
		p.delete('limit');
		p.set('locale', locale);
		return p;
	}

	function showEmailModal(title: string, subline: string, text: string) {
		const dlg = document.createElement('dialog');
		dlg.className = 'adminMemberIndexModal';
		const h = document.createElement('h2');
		h.className = 'adminMemberIndexModal__title';
		h.textContent = title;
		const sub = document.createElement('p');
		sub.className = 'adminMemberIndexModal__sub';
		sub.textContent = subline;
		const ta = document.createElement('textarea');
		ta.className = 'adminMemberIndexModal__textarea';
		ta.readOnly = true;
		ta.value = text;
		ta.rows = 8;
		ta.setAttribute('spellcheck', 'false');
		const closeBtn = document.createElement('button');
		closeBtn.type = 'button';
		closeBtn.className = 'adminBtn adminBtn--outline';
		closeBtn.textContent = t(strings, 'adminEmailModalClose');
		const cleanup = () => {
			dlg.close();
			dlg.remove();
		};
		closeBtn.addEventListener('click', cleanup);
		dlg.addEventListener('cancel', (e) => {
			e.preventDefault();
			cleanup();
		});
		dlg.append(h, sub, ta, closeBtn);
		const host = document.querySelector('.adminConsole') ?? document.body;
		host.appendChild(dlg);
		dlg.showModal();
	}

	copyBtn?.addEventListener('click', async () => {
		const p = buildListParams(1);
		p.delete('page');
		p.delete('limit');
		const mailingOrLapsed = currentView === 'mailing' || currentView === 'lapsed';
		p.set('emailScope', mailingOrLapsed ? 'opt_in' : 'all');
		setStatus(t(strings, 'adminLoading'));
		try {
			const res = await fetch(`/api/admin/member-emails-export?${p.toString()}`, { credentials: 'include' });
			const data = (await res.json()) as { lines?: string; lineCount?: number; error?: string };
			if (!res.ok || data.error) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			const lines = typeof data.lines === 'string' ? data.lines : '';
			const lineCount = typeof data.lineCount === 'number' ? data.lineCount : 0;
			const totalMembers = lastCounts[currentView] ?? 0;
			const optedIn = lastEmailOptIn ?? 0;
			let sub: string;
			if (mailingOrLapsed) {
				sub = t(strings, 'adminEmailModalSublineOptIn', { optedIn, total: totalMembers });
			} else {
				sub = t(strings, 'adminEmailModalSublineAll', { total: lineCount });
			}
			const title = t(strings, 'adminEmailListModalTitle', {
				view: viewLabel(strings, currentView),
			});
			showEmailModal(title, sub, lines);
			setStatus('');
		} catch {
			setStatus(t(strings, 'adminErrorGeneric'), 'error');
		}
	});

	exportBtn?.addEventListener('click', async () => {
		setStatus(t(strings, 'adminLoading'));
		try {
			const res = await fetch(`/api/admin/members-csv?${buildExportParams().toString()}`, {
				credentials: 'include',
			});
			if (!res.ok) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			const blob = await res.blob();
			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `lac-bernard-members-${defaultMembershipYear}.csv`;
			a.rel = 'noopener';
			a.click();
			queueMicrotask(() => URL.revokeObjectURL(a.href));
			setStatus(t(strings, 'adminExportMembersCsvSuccess'), 'success');
		} catch {
			setStatus(t(strings, 'adminErrorGeneric'), 'error');
		}
	});

	searchInput?.addEventListener('input', () => {
		if (searchDebounce) clearTimeout(searchDebounce);
		searchDebounce = setTimeout(() => {
			membersPage = 1;
			syncUrlFromState(true);
			void loadMembers();
		}, 280);
	});

	sortSelect?.addEventListener('change', () => {
		membersSort = sortSelect.value;
		membersPage = 1;
		syncUrlFromState(true);
		void loadMembers();
	});

	includeDisabledEl?.addEventListener('change', () => {
		includeDisabled = includeDisabledEl.checked;
		membersPage = 1;
		syncUrlFromState(true);
		void loadMembers();
	});

	lapsedSelect?.addEventListener('change', () => {
		const n = parseInt(lapsedSelect.value, 10);
		if (Number.isFinite(n)) lapsedSince = n;
		updateLapsedNote();
		membersPage = 1;
		syncUrlFromState(true);
		void loadMembers();
	});

	prevBtn?.addEventListener('click', () => {
		if (membersPage > 1) {
			membersPage--;
			syncUrlFromState(true);
			void loadMembers();
		}
	});

	nextBtn?.addEventListener('click', () => {
		if (membersPage < membersTotalPages) {
			membersPage++;
			syncUrlFromState(true);
			void loadMembers();
		}
	});

	/** Populate lapsed year dropdown (last 5 years). */
	function updateLapsedNote() {
		const noteEl = el<HTMLElement>('#admin-member-lapsed-note-text');
		if (!noteEl) return;
		noteEl.textContent = t(strings, 'adminLapsedSinceNote', {
			lapsedSince: String(lapsedSince),
			currentYear: String(defaultMembershipYear),
		});
	}

	function initLapsedSelect() {
		if (!lapsedSelect) return;
		lapsedSelect.innerHTML = '';
		for (let i = 0; i < 5; i++) {
			const y = defaultMembershipYear - i;
			const opt = document.createElement('option');
			opt.value = String(y);
			opt.textContent = String(y);
			lapsedSelect.appendChild(opt);
		}
		lapsedSelect.value = String(lapsedSince);
		updateLapsedNote();
	}

	function onMembersTabShown() {
		readUrlState();
		initLapsedSelect();
		if (lapsedSelect) lapsedSelect.value = String(lapsedSince);
		updateLapsedNote();
		renderPills();
		void loadMembers();
	}

	return { onMembersTabShown, syncUrlFromState, readUrlState };
}
