/** Client-side admin console (membership admin page). */

import { formatAdminLocaleDate, formatAdminLocaleDateTime } from '../lib/admin/formatLocaleDate';
import { computeManualPaymentSplit, roundMoney } from '../lib/admin/manualPaymentSplit';
import { formatAdminMemberNameTd, formatMemberJoinedNames } from '../lib/members/memberDisplayName';

export type AdminConsoleStrings = Record<string, string>;

type MemberRow = {
	id: string;
	created_at: string;
	/** general | associate from memberships for the admin filter year; null if no row for that year */
	membership_tier_for_year: string | null;
	first_name: string | null;
	last_name: string;
	secondary_first_name?: string | null;
	secondary_last_name?: string | null;
	primary_email: string | null;
	secondary_email: string | null;
	primary_phone: string | null;
	secondary_phone: string | null;
	lake_civic_number: string | null;
	lake_street_name: string | null;
	primary_address: string | null;
	primary_city: string | null;
	primary_province: string | null;
	primary_country: string | null;
	primary_postal_code: string | null;
	email_opt_in: boolean;
	notes: string | null;
	status: string;
	user_id: string | null;
};

type MembershipEmbed = {
	id: string;
	created_at: string;
	member_id: string;
	year: number;
	tier: string;
	status: string;
	/** Standard membership fee for tier (cents); null if tier is unknown */
	expected_membership_cents?: number | null;
	/** Sum of membership_amount already recorded toward this membership year */
	sum_membership_paid?: number;
	members: null | {
		id: string;
		first_name: string | null;
		last_name: string;
		secondary_first_name: string | null;
		secondary_last_name: string | null;
		primary_email: string | null;
		secondary_email: string | null;
	};
};

/** Trash icon for pending row remove (stroke uses `currentColor`) */
const ADMIN_PENDING_TRASH_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>';

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

type ExportEmailsJson = { emails?: string; error?: string; detail?: string };

function showEmailExportEmptyDialog(strings: AdminConsoleStrings): void {
	const dlg = document.createElement('dialog');
	dlg.className = 'adminEmailExportDialog';

	const title = document.createElement('p');
	title.className = 'adminEmailExportDialog__title';
	title.textContent = t(strings, 'adminExportEmailsEmpty');

	const closeBtn = document.createElement('button');
	closeBtn.type = 'button';
	closeBtn.className = 'adminBtn adminBtn--solid';
	closeBtn.textContent = t(strings, 'adminCopyEmailsDialogClose');

	const cleanup = () => {
		dlg.close();
		dlg.remove();
	};

	closeBtn.addEventListener('click', cleanup);
	dlg.addEventListener('cancel', (e) => {
		e.preventDefault();
		cleanup();
	});

	const actions = document.createElement('div');
	actions.className = 'adminEmailExportDialog__actions';
	actions.append(closeBtn);
	dlg.append(title, actions);
	const host = document.querySelector('.adminConsole') ?? document.querySelector('.adminPage') ?? document.body;
	host.appendChild(dlg);
	dlg.showModal();
}

function copyPlainTextToClipboard(strings: AdminConsoleStrings, text: string): void {
	if (!text.length) {
		showEmailExportEmptyDialog(strings);
		return;
	}

	const ta = document.createElement('textarea');
	ta.value = text;
	ta.setAttribute('readonly', '');
	ta.setAttribute('aria-hidden', 'true');
	ta.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;margin:0;border:0;padding:0;';
	document.body.appendChild(ta);
	ta.focus();
	ta.select();
	ta.setSelectionRange(0, text.length);

	let synced = false;
	try {
		synced = document.execCommand('copy');
	} catch {
		synced = false;
	}
	document.body.removeChild(ta);

	if (synced) {
		setStatusGlobal(strings, t(strings, 'adminExportEmailsCopied'), 'success');
		return;
	}

	void navigator.clipboard.writeText(text).then(
		() => {
			setStatusGlobal(strings, t(strings, 'adminExportEmailsCopied'), 'success');
		},
		() => {
			showEmailExportFallbackDialog(strings, text);
		},
	);
}

function showEmailExportFallbackDialog(strings: AdminConsoleStrings, text: string): void {
	const dlg = document.createElement('dialog');
	dlg.className = 'adminEmailExportDialog';

	const title = document.createElement('p');
	title.className = 'adminEmailExportDialog__title';
	title.textContent = t(strings, 'adminCopyEmailsFallbackPrompt');

	const ta = document.createElement('textarea');
	ta.readOnly = true;
	ta.className = 'adminEmailExportDialog__textarea adminInput';
	ta.value = text;
	ta.rows = 10;
	ta.setAttribute('spellcheck', 'false');

	const actions = document.createElement('div');
	actions.className = 'adminEmailExportDialog__actions';

	const copyBtn = document.createElement('button');
	copyBtn.type = 'button';
	copyBtn.className = 'adminBtn adminBtn--solid';
	copyBtn.textContent = t(strings, 'adminCopyEmailsDialogCopy');

	const closeBtn = document.createElement('button');
	closeBtn.type = 'button';
	closeBtn.className = 'adminBtn adminBtn--ghost';
	closeBtn.textContent = t(strings, 'adminCopyEmailsDialogClose');

	const cleanup = () => {
		dlg.close();
		dlg.remove();
	};

	copyBtn.addEventListener('click', () => {
		ta.focus();
		ta.select();
		void navigator.clipboard.writeText(text).then(
			() => {
				setStatusGlobal(strings, t(strings, 'adminExportEmailsCopied'), 'success');
				cleanup();
			},
			() => {
				try {
					if (document.execCommand('copy')) {
						setStatusGlobal(strings, t(strings, 'adminExportEmailsCopied'), 'success');
						cleanup();
					}
				} catch {
					/* keep dialog open */
				}
			},
		);
	});

	closeBtn.addEventListener('click', cleanup);
	dlg.addEventListener('cancel', (e) => {
		e.preventDefault();
		cleanup();
	});

	actions.append(copyBtn, closeBtn);
	dlg.append(title, ta, actions);
	const host = document.querySelector('.adminConsole') ?? document.querySelector('.adminPage') ?? document.body;
	host.appendChild(dlg);
	dlg.showModal();
	requestAnimationFrame(() => {
		ta.focus();
		ta.select();
	});
}

async function copyEmailsFromApi(strings: AdminConsoleStrings, urlWithQuery: string) {
	setStatusGlobal(strings, t(strings, 'adminLoading'));
	try {
		const res = await fetch(urlWithQuery, { credentials: 'include' });
		let data: ExportEmailsJson;
		try {
			data = (await res.json()) as ExportEmailsJson;
		} catch {
			setStatusGlobal(strings, t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		if (!res.ok || data?.error) {
			setStatusGlobal(strings, String(data?.detail ?? data?.error ?? t(strings, 'adminErrorGeneric')), 'error');
			return;
		}
		const text = typeof data.emails === 'string' ? data.emails : '';
		copyPlainTextToClipboard(strings, text);
	} catch {
		setStatusGlobal(strings, t(strings, 'adminErrorGeneric'), 'error');
	}
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
	tierLabels: { general: string; associate: string },
	defaultMembershipYear: number,
	adminMembersBase: string,
	numberLocale: string = 'en-CA',
) {
	const pendingBody = el<HTMLTableSectionElement>('#admin-pending-body');
	const paymentDialog = el<HTMLDialogElement>('#admin-payment-dialog');
	const paymentMembershipId = el<HTMLInputElement>('#admin-payment-membership-id');
	const overviewMount = el<HTMLElement>('#admin-overview-mount');
	const auditBody = el<HTMLTableSectionElement>('#admin-audit-body');
	const pendingBadge = el<HTMLElement>('#admin-pending-badge');
	const newMembersBadge = el<HTMLElement>('#admin-new-members-badge');
	statusElGlobal = el<HTMLElement>('#admin-status');
	const tabs = document.querySelectorAll<HTMLButtonElement>('[data-admin-tab]');
	const panels = document.querySelectorAll<HTMLElement>('[data-admin-panel]');

	const fmtCad = (n: number) =>
		new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'CAD' }).format(n);

	function updatePaymentPreviewConsole() {
		const preview = el<HTMLElement>('#admin-payment-split-preview');
		const amtInput = el<HTMLInputElement>('#admin-payment-amount');
		if (!preview || !amtInput) return;
		const tier = el<HTMLInputElement>('#admin-payment-tier')?.value ?? 'general';
		const status = el<HTMLInputElement>('#admin-payment-status')?.value ?? 'pending';
		const sumPaidRaw = el<HTMLInputElement>('#admin-payment-sum-paid')?.value ?? '0';
		const sumPaid = roundMoney(parseFloat(sumPaidRaw) || 0);
		const raw = parseFloat(String(amtInput.value ?? ''));
		if (!Number.isFinite(raw) || raw <= 0) {
			preview.hidden = true;
			preview.textContent = '';
			return;
		}
		const split = computeManualPaymentSplit({
			amount: roundMoney(raw),
			tier,
			membershipStatus: status,
			sumMembershipPaid: sumPaid,
		});
		preview.hidden = false;
		preview.innerHTML = `${escapeHtml(
			t(strings, 'adminPaymentPreviewMembership', { amount: fmtCad(split.membershipAmount) }),
		)}<br />${escapeHtml(
			t(strings, 'adminPaymentPreviewDonation', { amount: fmtCad(split.donationAmount) }),
		)}`;
	}

	let membersPage = 1;
	let membersTotalPages = 1;
	let newMembersPage = 1;
	let newMembersTotalPages = 1;
	let auditPage = 1;
	let auditTotalPages = 1;
	let membersSort = 'created_at_desc';

	function setStatus(msg: string, kind: 'neutral' | 'error' | 'success' = 'neutral') {
		setStatusGlobal(strings, msg, kind);
	}

	function setPendingBadge(count: number) {
		if (!pendingBadge) return;
		pendingBadge.textContent = count > 0 ? t(strings, 'adminPendingBadge', { count }) : '';
		pendingBadge.hidden = count <= 0;
	}

	function setNewMembersBadge(count: number) {
		if (!newMembersBadge) return;
		newMembersBadge.textContent = count > 0 ? t(strings, 'adminNewMembersBadge', { count }) : '';
		newMembersBadge.hidden = count <= 0;
	}

	function getMemberFilterYear(): number {
		const raw = el<HTMLInputElement>('#admin-members-year')?.value?.trim() ?? '';
		const n = parseInt(raw, 10);
		return Number.isFinite(n) ? n : defaultMembershipYear;
	}

	/** Keep "Active for {year}" / "Did not renew for {year}" in sync with the membership year field */
	function syncMembersScopeLabels() {
		const scope = el<HTMLSelectElement>('#admin-members-scope');
		if (!scope) return;
		const y = String(getMemberFilterYear());
		const optActive = scope.querySelector<HTMLOptionElement>('option[value="active"]');
		const optNot = scope.querySelector<HTMLOptionElement>('option[value="not_active"]');
		if (optActive) optActive.textContent = t(strings, 'adminScopeActive', { year: y });
		if (optNot) optNot.textContent = t(strings, 'adminScopeNotRenewed', { year: y });
	}

	function buildMembersListParams(): URLSearchParams {
		const q = el<HTMLInputElement>('#admin-members-q')?.value?.trim() ?? '';
		const membership = el<HTMLSelectElement>('#admin-members-scope')?.value ?? 'active';
		const tier = el<HTMLSelectElement>('#admin-members-tier')?.value ?? 'all';
		const memberStatus = el<HTMLSelectElement>('#admin-members-member-status')?.value ?? 'verified';

		const params = new URLSearchParams({
			page: String(membersPage),
			limit: '25',
			sort: membersSort,
			year: String(getMemberFilterYear()),
			membership,
			tier,
			memberStatus,
		});
		if (q) params.set('q', q);
		return params;
	}

	function buildNewMembersListParams(): URLSearchParams {
		const q = el<HTMLInputElement>('#admin-members-q')?.value?.trim() ?? '';
		/** Match overview `newMembersPending` count: any `members.status = new`, not directory scope (active for year). */
		const params = new URLSearchParams({
			page: String(newMembersPage),
			limit: '25',
			sort: membersSort,
			year: String(getMemberFilterYear()),
			membership: 'all',
			tier: 'all',
			memberStatus: 'new',
		});
		if (q) params.set('q', q);
		return params;
	}

	function buildMembersExportQueryParams(): URLSearchParams {
		const p = buildMembersListParams();
		p.delete('page');
		p.delete('limit');
		p.delete('sort');
		return p;
	}

	function showTab(name: string) {
		setStatus('');
		tabs.forEach((btn) => {
			const active = btn.dataset.adminTab === name;
			btn.setAttribute('aria-selected', active ? 'true' : 'false');
		});
		panels.forEach((p) => {
			p.hidden = p.dataset.adminPanel !== name;
		});

		if (name === 'members') {
			void loadMembers();
		} else if (name === 'pending') {
			void loadPending();
		} else if (name === 'newMembers') {
			void loadNewMembers();
		} else if (name === 'overview') {
			void loadOverview();
		} else if (name === 'auditLog') {
			void loadAuditLog();
		}
	}

	tabs.forEach((btn) => {
		btn.addEventListener('click', () => showTab(btn.dataset.adminTab ?? 'overview'));
	});

	overviewMount?.addEventListener('click', (e) => {
		const nav = (e.target as HTMLElement).closest('[data-admin-kpi-nav]');
		if (!nav) return;
		const dest = nav.getAttribute('data-admin-kpi-nav');
		if (dest === 'members' || dest === 'pending' || dest === 'newMembers') {
			e.preventDefault();
			showTab(dest);
		}
	});

	el<HTMLInputElement>('#admin-payment-amount')?.addEventListener('input', updatePaymentPreviewConsole);

	paymentDialog?.addEventListener('close', () => {
		const preview = el<HTMLElement>('#admin-payment-split-preview');
		if (preview) {
			preview.hidden = true;
			preview.textContent = '';
		}
	});

	el<HTMLFormElement>('#admin-payment-form')?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const fd = new FormData(form);
		const amount = parseFloat(String(fd.get('amount') ?? ''));
		const method = String(fd.get('method') ?? '');
		const date = String(fd.get('date') ?? '').trim();
		const notes = String(fd.get('notes') ?? '').trim();
		const reference = String(fd.get('reference') ?? '').trim();
		const mid = paymentMembershipId?.value;
		if (!mid) return;
		if (!Number.isFinite(amount) || amount <= 0) {
			setStatus(t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ error?: string }>(`/api/admin/memberships/${encodeURIComponent(mid)}/record-payment`, {
			method: 'POST',
			body: JSON.stringify({
				amount,
				method,
				date: date || undefined,
				notes: notes || undefined,
				...(reference ? { reference } : {}),
			}),
		});
		if (!ok) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		paymentDialog?.close();
		form.reset();
		setStatus(t(strings, 'adminPaymentSaved'), 'success');
		await loadPending();
		void loadOverview();
	});

	el<HTMLButtonElement>('#admin-payment-cancel')?.addEventListener('click', () => paymentDialog?.close());

	el<HTMLFormElement>('#admin-members-search')?.addEventListener('submit', (e) => {
		e.preventDefault();
		membersPage = 1;
		newMembersPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-sort')?.addEventListener('change', (e) => {
		membersSort = (e.target as HTMLSelectElement).value;
		membersPage = 1;
		newMembersPage = 1;
		void loadMembers();
	});

	el<HTMLInputElement>('#admin-members-year')?.addEventListener('input', () => {
		syncMembersScopeLabels();
	});
	el<HTMLInputElement>('#admin-members-year')?.addEventListener('change', () => {
		syncMembersScopeLabels();
		membersPage = 1;
		newMembersPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-scope')?.addEventListener('change', () => {
		membersPage = 1;
		newMembersPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-tier')?.addEventListener('change', () => {
		membersPage = 1;
		newMembersPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-member-status')?.addEventListener('change', () => {
		membersPage = 1;
		void loadMembers();
	});

	el<HTMLButtonElement>('#admin-export-emails-members')?.addEventListener('click', () => {
		void copyEmailsFromApi(strings, `/api/admin/member-emails-export?${buildMembersExportQueryParams()}`);
	});

	el<HTMLButtonElement>('#admin-members-prev')?.addEventListener('click', () => {
		if (membersPage > 1) {
			membersPage--;
			void loadMembers();
		}
	});
	el<HTMLButtonElement>('#admin-members-next')?.addEventListener('click', () => {
		if (membersPage < membersTotalPages) {
			membersPage++;
			void loadMembers();
		}
	});

	el<HTMLButtonElement>('#admin-new-members-prev')?.addEventListener('click', () => {
		if (newMembersPage > 1) {
			newMembersPage--;
			void loadNewMembers();
		}
	});
	el<HTMLButtonElement>('#admin-new-members-next')?.addEventListener('click', () => {
		if (newMembersPage < newMembersTotalPages) {
			newMembersPage++;
			void loadNewMembers();
		}
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
		if (raw === 'general') return tierLabels.general;
		if (raw === 'associate') return tierLabels.associate;
		return raw;
	}

	function memberRowOpenAttrs(mem: {
		id: string;
		first_name: string | null;
		last_name: string;
		secondary_first_name?: string | null;
		secondary_last_name?: string | null;
	}): string {
		const href = `${adminMembersBase}/${encodeURIComponent(mem.id)}`;
		const name = formatMemberJoinedNames(mem);
		const rowLabel = `${t(strings, 'adminMemberOpen')}: ${name}`;
		return ` data-admin-member-href="${escapeHtml(href)}" tabindex="0" role="link" aria-label="${escapeHtml(rowLabel)}"`;
	}

	async function loadOverview() {
		if (!overviewMount) return;
		overviewMount.innerHTML = `<p class="adminHint">${t(strings, 'adminLoading')}</p>`;
		const { ok, data } = await fetchJson<{
			recentVerifiedMembers?: Array<{
				member: {
					id: string;
					created_at: string;
					first_name: string | null;
					last_name: string;
					secondary_first_name?: string | null;
					secondary_last_name?: string | null;
				};
				tier: string | null;
				eventAt: string;
			}>;
			recentActiveMemberships?: Array<{
				membership: {
					year: number;
					tier: string;
					created_at: string;
					activated_at: string | null;
				};
				member: {
					id: string;
					first_name: string | null;
					last_name: string;
					secondary_first_name?: string | null;
					secondary_last_name?: string | null;
				} | null;
			}>;
			counts?: {
				pendingMemberships: number;
				activeForYear: number;
				newMembersPending?: number;
				membershipYear: number;
			};
			error?: string;
		}>('/api/admin/activity');
		if (!ok) {
			overviewMount.innerHTML = `<p class="adminHint">${data?.error ?? t(strings, 'adminErrorGeneric')}</p>`;
			return;
		}
		const c = data.counts;
		if (c) {
			setPendingBadge(c.pendingMemberships);
			setNewMembersBadge(typeof c.newMembersPending === 'number' ? c.newMembersPending : 0);
		}

		const verifiedRows = (data.recentVerifiedMembers ?? [])
			.map(({ member: m, tier }) => {
				const nameTd = formatAdminMemberNameTd(m, escapeHtml);
				const when = m.created_at ? formatAdminLocaleDate(m.created_at) : '—';
				return `<tr${memberRowOpenAttrs(m)}>${nameTd}<td>${escapeHtml(overviewTierLabel(tier))}</td><td>${escapeHtml(when)}</td></tr>`;
			})
			.join('');

		const activeRows = (data.recentActiveMemberships ?? [])
			.filter((row): row is typeof row & { member: NonNullable<(typeof row)['member']> } => row.member != null)
			.map(({ membership: ms, member: m }) => {
				const nameTd = formatAdminMemberNameTd(m, escapeHtml);
				const whenRaw = ms.activated_at ?? ms.created_at;
				const when = whenRaw ? formatAdminLocaleDate(whenRaw) : '—';
				return `<tr${memberRowOpenAttrs(m)}>${nameTd}<td>${escapeHtml(overviewTierLabel(ms.tier))}</td><td>${ms.year}</td><td>${escapeHtml(when)}</td></tr>`;
			})
			.join('');

		const nNew = typeof c?.newMembersPending === 'number' ? c.newMembersPending : 0;
		const kpi =
			c ?
				`<div class="adminKpiRow" role="region">
				<button type="button" class="adminKpi adminKpi--activeYear" data-admin-kpi-nav="members"
					aria-label="${escapeHtml(t(strings, 'adminOverviewKpiAriaMembers', { count: c.activeForYear, year: c.membershipYear }))}"><span class="adminKpiValue">${c.activeForYear}</span><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminOverviewCountActive', { year: c.membershipYear }))}</span></button>
				<button type="button" class="adminKpi adminKpi--pending" data-admin-kpi-nav="pending"
					aria-label="${escapeHtml(t(strings, 'adminOverviewKpiAriaPending', { count: c.pendingMemberships }))}"><span class="adminKpiValue">${c.pendingMemberships}</span><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminOverviewCountPending'))}</span></button>
				<button type="button" class="adminKpi adminKpi--newMembers" data-admin-kpi-nav="newMembers"
					aria-label="${escapeHtml(t(strings, 'adminOverviewKpiAriaNewMembers', { count: nNew }))}"><span class="adminKpiValue">${nNew}</span><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminOverviewCountNewMembers'))}</span></button>
			</div>`
			:	'';

		overviewMount.innerHTML = `
			${kpi}
			<section class="adminOverviewSection">
			<h3 class="adminOverviewHeading">${escapeHtml(t(strings, 'adminOverviewRecentTitle'))}</h3>
			<h4 class="adminOverviewSubheading">${escapeHtml(t(strings, 'adminOverviewRecentVerifiedSubtitle'))}</h4>
			<div class="tableWrap"><table class="adminTable"><thead><tr>
				<th>${escapeHtml(t(strings, 'adminTableName'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableTier'))}</th>
				<th>${escapeHtml(t(strings, 'adminOverviewColWhen'))}</th>
			</tr></thead><tbody>${verifiedRows || `<tr><td colspan="3">—</td></tr>`}</tbody></table></div>
			<h4 class="adminOverviewSubheading">${escapeHtml(t(strings, 'adminOverviewRecentActiveSubtitle'))}</h4>
			<div class="tableWrap"><table class="adminTable"><thead><tr>
				<th>${escapeHtml(t(strings, 'adminTableName'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableTier'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableYear'))}</th>
				<th>${escapeHtml(t(strings, 'adminOverviewColWhen'))}</th>
			</tr></thead><tbody>${activeRows || `<tr><td colspan="4">—</td></tr>`}</tbody></table></div>
			</section>
		`;
		overviewMount.querySelectorAll<HTMLTableSectionElement>('.adminOverviewSection tbody').forEach((tbody) => {
			wireMembersTableRows(tbody);
		});
	}

	async function loadPending() {
		if (!pendingBody) return;
		pendingBody.innerHTML = `<tr><td colspan="7">${t(strings, 'adminLoading')}</td></tr>`;
		const { ok, data } = await fetchJson<{
			memberships?: MembershipEmbed[];
			total?: number;
			error?: string;
		}>('/api/admin/memberships?status=pending&limit=100');
		if (!ok || !data.memberships) {
			pendingBody.innerHTML = `<tr><td colspan="7">${data?.error ?? t(strings, 'adminErrorGeneric')}</td></tr>`;
			setPendingBadge(0);
			return;
		}
		const rows = data.memberships;
		setPendingBadge(typeof data.total === 'number' ? data.total : rows.length);
		if (rows.length === 0) {
			pendingBody.innerHTML = `<tr><td colspan="7">${t(strings, 'adminPendingEmpty')}</td></tr>`;
			return;
		}
		pendingBody.innerHTML = rows
			.map((m) => {
				const mem = m.members;
				const nameTd =
					mem ?
						formatAdminMemberNameTd(
							{
								first_name: mem.first_name,
								last_name: mem.last_name,
								secondary_first_name: mem.secondary_first_name,
								secondary_last_name: mem.secondary_last_name,
							},
							escapeHtml,
						)
					:	`<td>—</td>`;
				const email = mem?.primary_email ?? '—';
				const tier =
					m.tier === 'general' ? tierLabels.general : m.tier === 'associate' ? tierLabels.associate : m.tier;
				const expected = formatExpectedMembershipFee(m.expected_membership_cents, numberLocale);
				const sumPaid =
					typeof m.sum_membership_paid === 'number' && Number.isFinite(m.sum_membership_paid) ?
						m.sum_membership_paid
					:	0;
				const rowOpen = mem ? memberRowOpenAttrs(mem) : '';
				return `<tr${rowOpen}>
          ${nameTd}
          <td>${escapeHtml(email)}</td>
          <td>${m.year}</td>
          <td>${escapeHtml(tier)}</td>
          <td>${escapeHtml(m.status)}</td>
          <td>${escapeHtml(expected)}</td>
          <td class="adminPendingActions"><button type="button" class="adminBtn adminBtn--outline" data-open-payment data-membership-id="${escapeHtml(m.id)}" data-tier="${escapeHtml(m.tier)}" data-status="${escapeHtml(m.status)}" data-sum-paid="${String(sumPaid)}">${t(strings, 'adminRecordPaymentBtn')}</button><button type="button" class="adminPendingTrash" data-cancel-pending data-membership-id="${escapeHtml(m.id)}" aria-label="${escapeHtml(t(strings, 'adminCancelPendingAriaLabel'))}">${ADMIN_PENDING_TRASH_ICON}</button></td>
        </tr>`;
			})
			.join('');
		pendingBody.querySelectorAll<HTMLButtonElement>('[data-open-payment]').forEach((b) => {
			b.addEventListener('click', () => {
				const id = b.dataset.membershipId;
				if (id && paymentMembershipId && paymentDialog) {
					paymentMembershipId.value = id;
					const tierEl = el<HTMLInputElement>('#admin-payment-tier');
					const statusEl = el<HTMLInputElement>('#admin-payment-status');
					const sumEl = el<HTMLInputElement>('#admin-payment-sum-paid');
					if (tierEl) tierEl.value = b.dataset.tier ?? 'general';
					if (statusEl) statusEl.value = b.dataset.status ?? 'pending';
					if (sumEl) sumEl.value = b.dataset.sumPaid ?? '0';
					paymentDialog.showModal();
					queueMicrotask(() => {
						updatePaymentPreviewConsole();
						el<HTMLInputElement>('#admin-payment-amount')?.focus();
					});
				}
			});
		});
		pendingBody.querySelectorAll<HTMLButtonElement>('[data-cancel-pending]').forEach((b) => {
			b.addEventListener('click', async () => {
				const id = b.dataset.membershipId;
				if (!id) return;
				if (!confirm(t(strings, 'adminCancelPendingConfirm'))) return;
				setStatus(t(strings, 'adminLoading'));
				const { ok, data } = await fetchJson<{ error?: string }>(
					`/api/admin/memberships/${encodeURIComponent(id)}/cancel-pending`,
					{ method: 'POST', body: '{}' },
				);
				if (!ok) {
					const code = data?.error;
					setStatus(
						code === 'not_pending' ? t(strings, 'adminCancelPendingErrorNotPending') : t(strings, 'adminErrorGeneric'),
						'error',
					);
					return;
				}
				setStatus(t(strings, 'adminCancelPendingSuccess'), 'success');
				await loadPending();
				void loadOverview();
			});
		});
		wireMembersTableRows(pendingBody);
	}

	function wireMembersTableRows(body: HTMLElement) {
		body.querySelectorAll<HTMLTableRowElement>('tr[data-admin-member-href]').forEach((tr) => {
			const go = () => {
				const href = tr.dataset.adminMemberHref;
				if (href) window.location.assign(href);
			};
			tr.addEventListener('click', (e) => {
				const tgt = e.target as HTMLElement;
				if (tgt.closest('a, button')) return;
				go();
			});
			tr.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					go();
				}
			});
		});
	}

	async function loadMembers() {
		const body = el<HTMLTableSectionElement>('#admin-members-body');
		if (!body) return;
		body.innerHTML = `<tr><td colspan="4">${t(strings, 'adminLoading')}</td></tr>`;
		const params = buildMembersListParams();
		const { ok, data } = await fetchJson<{
			members?: MemberRow[];
			total?: number;
			page?: number;
			limit?: number;
			error?: string;
		}>(`/api/admin/members?${params}`);
		if (!ok || !data.members) {
			body.innerHTML = `<tr><td colspan="4">${data?.error ?? t(strings, 'adminErrorGeneric')}</td></tr>`;
			return;
		}
		const total = data.total ?? 0;
		const limit = data.limit ?? 25;
		membersTotalPages = Math.max(1, Math.ceil(total / limit));
		const pageInfo = el('#admin-members-pageinfo');
		if (pageInfo) {
			pageInfo.textContent = t(strings, 'adminPageOf', { page: membersPage, total: membersTotalPages });
		}

		body.innerHTML = data.members
			.map((m) => {
				const nameTd = formatAdminMemberNameTd(m, escapeHtml);
				const email = m.primary_email ?? '—';
				const rawTier = m.membership_tier_for_year;
				let tierCell = '';
				if (rawTier === 'general') tierCell = tierLabels.general;
				else if (rawTier === 'associate') tierCell = tierLabels.associate;
				else if (rawTier) tierCell = rawTier;
				const href = `${adminMembersBase}/${encodeURIComponent(m.id)}`;
				const rowLabel = `${t(strings, 'adminMemberOpen')}: ${formatMemberJoinedNames(m)}`;
				return `<tr data-admin-member-href="${escapeHtml(href)}" tabindex="0" role="link" aria-label="${escapeHtml(rowLabel)}">
          ${nameTd}
          <td>${escapeHtml(email)}</td>
          <td>${escapeHtml(tierCell)}</td>
          <td>${escapeHtml(formatAdminLocaleDate(m.created_at))}</td>
        </tr>`;
			})
			.join('');
		wireMembersTableRows(body);
	}

	async function loadNewMembers() {
		const body = el<HTMLTableSectionElement>('#admin-new-members-body');
		if (!body) return;
		body.innerHTML = `<tr><td colspan="4">${t(strings, 'adminLoading')}</td></tr>`;
		const params = buildNewMembersListParams();
		const { ok, data } = await fetchJson<{
			members?: MemberRow[];
			total?: number;
			page?: number;
			limit?: number;
			error?: string;
		}>(`/api/admin/members?${params}`);
		if (!ok || !data.members) {
			body.innerHTML = `<tr><td colspan="4">${data?.error ?? t(strings, 'adminErrorGeneric')}</td></tr>`;
			return;
		}
		const total = data.total ?? 0;
		const limit = data.limit ?? 25;
		newMembersTotalPages = Math.max(1, Math.ceil(total / limit));
		const pageInfo = el('#admin-new-members-pageinfo');
		if (pageInfo) {
			pageInfo.textContent = t(strings, 'adminPageOf', { page: newMembersPage, total: newMembersTotalPages });
		}

		if (data.members.length === 0) {
			body.innerHTML = `<tr><td colspan="4">${t(strings, 'adminNewMembersEmpty')}</td></tr>`;
			return;
		}

		body.innerHTML = data.members
			.map((m) => {
				const nameTd = formatAdminMemberNameTd(m, escapeHtml);
				const email = m.primary_email ?? '—';
				const rawTier = m.membership_tier_for_year;
				let tierCell = '';
				if (rawTier === 'general') tierCell = tierLabels.general;
				else if (rawTier === 'associate') tierCell = tierLabels.associate;
				else if (rawTier) tierCell = rawTier;
				const href = `${adminMembersBase}/${encodeURIComponent(m.id)}`;
				const rowLabel = `${t(strings, 'adminMemberOpen')}: ${formatMemberJoinedNames(m)}`;
				return `<tr data-admin-member-href="${escapeHtml(href)}" tabindex="0" role="link" aria-label="${escapeHtml(rowLabel)}">
          ${nameTd}
          <td>${escapeHtml(email)}</td>
          <td>${escapeHtml(tierCell)}</td>
          <td>${escapeHtml(formatAdminLocaleDate(m.created_at))}</td>
        </tr>`;
			})
			.join('');
		wireMembersTableRows(body);
	}

	syncMembersScopeLabels();
	showTab('overview');
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

