/** Client-side admin console (membership admin page). */

export type AdminConsoleStrings = Record<string, string>;

type MemberRow = {
	id: string;
	created_at: string;
	/** general | associate from memberships for the admin filter year; null if no row for that year */
	membership_tier_for_year: string | null;
	first_name: string | null;
	last_name: string;
	primary_email: string | null;
	secondary_email: string | null;
	primary_phone: string | null;
	secondary_phone: string | null;
	lake_phone: string | null;
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
	members: null | {
		id: string;
		first_name: string | null;
		last_name: string;
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
	const pendingBadge = el<HTMLElement>('#admin-pending-badge');
	statusElGlobal = el<HTMLElement>('#admin-status');
	const tabs = document.querySelectorAll<HTMLButtonElement>('[data-admin-tab]');
	const panels = document.querySelectorAll<HTMLElement>('[data-admin-panel]');

	let membersPage = 1;
	let membersTotalPages = 1;
	let membersSort = 'created_at_desc';

	function setStatus(msg: string, kind: 'neutral' | 'error' | 'success' = 'neutral') {
		setStatusGlobal(strings, msg, kind);
	}

	function setPendingBadge(count: number) {
		if (!pendingBadge) return;
		pendingBadge.textContent = count > 0 ? t(strings, 'adminPendingBadge', { count }) : '';
		pendingBadge.hidden = count <= 0;
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

		const params = new URLSearchParams({
			page: String(membersPage),
			limit: '25',
			sort: membersSort,
			year: String(getMemberFilterYear()),
			membership,
			tier,
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
		} else if (name === 'overview') {
			void loadOverview();
		}
	}

	tabs.forEach((btn) => {
		btn.addEventListener('click', () => showTab(btn.dataset.adminTab ?? 'overview'));
	});

	el<HTMLFormElement>('#admin-payment-form')?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const fd = new FormData(form);
		const amount = parseFloat(String(fd.get('amount') ?? ''));
		const method = String(fd.get('method') ?? '');
		const date = String(fd.get('date') ?? '').trim();
		const notes = String(fd.get('notes') ?? '').trim();
		const mid = paymentMembershipId?.value;
		if (!mid) return;
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ error?: string }>(`/api/admin/memberships/${encodeURIComponent(mid)}/record-payment`, {
			method: 'POST',
			body: JSON.stringify({
				amount,
				method,
				date: date || undefined,
				notes: notes || undefined,
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
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-sort')?.addEventListener('change', (e) => {
		membersSort = (e.target as HTMLSelectElement).value;
		membersPage = 1;
		void loadMembers();
	});

	el<HTMLInputElement>('#admin-members-year')?.addEventListener('input', () => {
		syncMembersScopeLabels();
	});
	el<HTMLInputElement>('#admin-members-year')?.addEventListener('change', () => {
		syncMembersScopeLabels();
		membersPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-scope')?.addEventListener('change', () => {
		membersPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-tier')?.addEventListener('change', () => {
		membersPage = 1;
		void loadMembers();
	});

	el<HTMLButtonElement>('#admin-export-emails-members')?.addEventListener('click', () => {
		void copyEmailsFromApi(strings, `/api/admin/member-emails-export?${buildMembersExportQueryParams()}`);
	});

	el<HTMLButtonElement>('#admin-export-emails-pending')?.addEventListener('click', () => {
		void copyEmailsFromApi(strings, '/api/admin/pending-member-emails');
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

	async function loadOverview() {
		if (!overviewMount) return;
		overviewMount.innerHTML = `<p class="adminHint">${t(strings, 'adminLoading')}</p>`;
		const { ok, data } = await fetchJson<{
			recentPayments?: unknown[];
			newMembers?: unknown[];
			recentMemberships?: unknown[];
			counts?: {
				pendingMemberships: number;
				activeForYear: number;
				totalMembers: number;
				membershipYear: number;
			};
			recentAudit?: unknown[];
			error?: string;
		}>('/api/admin/activity');
		if (!ok) {
			overviewMount.innerHTML = `<p class="adminHint">${data?.error ?? t(strings, 'adminErrorGeneric')}</p>`;
			return;
		}
		const c = data.counts;
		if (c) {
			setPendingBadge(c.pendingMemberships);
		}

		const payments = (data.recentPayments ?? []) as Array<{
			id: number;
			amount: number | null;
			method: string | null;
			date: string | null;
			created_at: string;
			membership_year: number | null;
			member: { id: string; first_name: string | null; last_name: string; primary_email: string | null } | null;
		}>;
		const payRows = payments
			.map((p) => {
				const mem = p.member;
				const name = mem ? `${mem.first_name ?? ''} ${mem.last_name}`.trim() : '—';
				const href = mem ? `${adminMembersBase}/${encodeURIComponent(mem.id)}` : '#';
				return `<tr>
					<td><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></td>
					<td>${p.membership_year ?? '—'}</td>
					<td>${escapeHtml(methodLabel(strings, p.method))}</td>
					<td>${p.amount != null ? escapeHtml(String(p.amount)) : '—'}</td>
					<td>${escapeHtml(fmtDate(p.date ?? p.created_at))}</td>
				</tr>`;
			})
			.join('');

		const newMems = (data.newMembers ?? []) as Array<{
			id: string;
			created_at: string;
			first_name: string | null;
			last_name: string;
			primary_email: string | null;
		}>;
		const nmRows = newMems
			.map((m) => {
				const name = `${m.first_name ?? ''} ${m.last_name}`.trim();
				const href = `${adminMembersBase}/${encodeURIComponent(m.id)}`;
				return `<tr>
					<td><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></td>
					<td>${escapeHtml(m.primary_email ?? '—')}</td>
					<td>${escapeHtml(fmtDate(m.created_at))}</td>
				</tr>`;
			})
			.join('');

		const recMs = (data.recentMemberships ?? []) as Array<{
			id: string;
			created_at: string;
			year: number;
			tier: string;
			status: string;
			member: { id: string; first_name: string | null; last_name: string; primary_email: string | null } | null;
		}>;
		const msRows = recMs
			.map((m) => {
				const mem = m.member;
				const name = mem ? `${mem.first_name ?? ''} ${mem.last_name}`.trim() : '—';
				const href = mem ? `${adminMembersBase}/${encodeURIComponent(mem.id)}` : '#';
				const tier =
					m.tier === 'general' ? tierLabels.general : m.tier === 'associate' ? tierLabels.associate : m.tier;
				return `<tr>
					<td><a href="${escapeHtml(href)}">${escapeHtml(name)}</a></td>
					<td>${m.year}</td>
					<td>${escapeHtml(tier)}</td>
					<td>${statusPillHtml(m.status)}</td>
					<td>${escapeHtml(fmtDate(m.created_at))}</td>
				</tr>`;
			})
			.join('');

		const audits = (data.recentAudit ?? []) as Array<{
			created_at: string;
			actor_user_id: string;
			action: string;
			entity_type: string | null;
			entity_id: string | null;
		}>;
		const auditRows = audits
			.map(
				(a) =>
					`<tr><td>${escapeHtml(fmtDate(a.created_at))}</td><td>${escapeHtml(a.action)}</td><td>${escapeHtml(a.entity_type ?? '')}</td><td>${escapeHtml(a.entity_id ?? '')}</td></tr>`,
			)
			.join('');

		const kpi =
			c ?
				`<div class="adminKpiRow" role="region">
				<div class="adminKpi adminKpi--pending"><span class="adminKpiValue">${c.pendingMemberships}</span><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminOverviewCountPending'))}</span></div>
				<div class="adminKpi adminKpi--activeYear"><span class="adminKpiValue">${c.activeForYear}</span><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminOverviewCountActive', { year: c.membershipYear }))}</span></div>
				<div class="adminKpi adminKpi--directory"><span class="adminKpiValue">${c.totalMembers}</span><span class="adminKpiLabel">${escapeHtml(t(strings, 'adminOverviewCountTotal'))}</span></div>
			</div>`
			:	'';

		overviewMount.innerHTML = `
			${kpi}
			<section class="adminOverviewSection">
			<h3 class="adminOverviewHeading">${escapeHtml(t(strings, 'adminOverviewPaymentsTitle'))}</h3>
			<div class="tableWrap"><table class="adminTable"><thead><tr>
				<th>${escapeHtml(t(strings, 'adminTableName'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableYear'))}</th>
				<th>${escapeHtml(t(strings, 'adminMethodLabel'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableAmount'))}</th>
				<th>${escapeHtml(t(strings, 'adminTablePaymentDate'))}</th>
			</tr></thead><tbody>${payRows || `<tr><td colspan="5">—</td></tr>`}</tbody></table></div>
			</section>
			<section class="adminOverviewSection">
			<h3 class="adminOverviewHeading">${escapeHtml(t(strings, 'adminOverviewMembersTitle'))}</h3>
			<div class="tableWrap"><table class="adminTable"><thead><tr>
				<th>${escapeHtml(t(strings, 'adminTableName'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableEmail'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableCreated'))}</th>
			</tr></thead><tbody>${nmRows || `<tr><td colspan="3">—</td></tr>`}</tbody></table></div>
			</section>
			<section class="adminOverviewSection">
			<h3 class="adminOverviewHeading">${escapeHtml(t(strings, 'adminOverviewMembershipsTitle'))}</h3>
			<div class="tableWrap"><table class="adminTable"><thead><tr>
				<th>${escapeHtml(t(strings, 'adminTableName'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableYear'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableTier'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableStatus'))}</th>
				<th>${escapeHtml(t(strings, 'adminTableCreated'))}</th>
			</tr></thead><tbody>${msRows || `<tr><td colspan="5">—</td></tr>`}</tbody></table></div>
			</section>
			<section class="adminOverviewSection">
			<h3 class="adminOverviewHeading">${escapeHtml(t(strings, 'adminOverviewAuditTitle'))}</h3>
			<div class="tableWrap"><table class="adminTable"><thead><tr>
				<th>${escapeHtml(t(strings, 'adminAuditWhen'))}</th>
				<th>${escapeHtml(t(strings, 'adminAuditAction'))}</th>
				<th>${escapeHtml(t(strings, 'adminAuditEntityType'))}</th>
				<th>${escapeHtml(t(strings, 'adminAuditEntityId'))}</th>
			</tr></thead><tbody>${auditRows || `<tr><td colspan="4">—</td></tr>`}</tbody></table></div>
			</section>
		`;
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
				const name = mem ? `${mem.first_name ?? ''} ${mem.last_name}`.trim() : '—';
				const email = mem?.primary_email ?? '—';
				const tier =
					m.tier === 'general' ? tierLabels.general : m.tier === 'associate' ? tierLabels.associate : m.tier;
				const detailHref = mem ? `${adminMembersBase}/${encodeURIComponent(mem.id)}` : '#';
				const expected = formatExpectedMembershipFee(m.expected_membership_cents, numberLocale);
				return `<tr>
          <td><a href="${escapeHtml(detailHref)}">${escapeHtml(name)}</a></td>
          <td>${escapeHtml(email)}</td>
          <td>${m.year}</td>
          <td>${escapeHtml(tier)}</td>
          <td>${escapeHtml(m.status)}</td>
          <td>${escapeHtml(expected)}</td>
          <td class="adminPendingActions"><button type="button" class="adminBtn adminBtn--outline" data-open-payment data-membership-id="${escapeHtml(m.id)}">${t(strings, 'adminRecordPaymentBtn')}</button><button type="button" class="adminPendingTrash" data-cancel-pending data-membership-id="${escapeHtml(m.id)}" aria-label="${escapeHtml(t(strings, 'adminCancelPendingAriaLabel'))}">${ADMIN_PENDING_TRASH_ICON}</button></td>
        </tr>`;
			})
			.join('');
		pendingBody.querySelectorAll<HTMLButtonElement>('[data-open-payment]').forEach((b) => {
			b.addEventListener('click', () => {
				const id = b.dataset.membershipId;
				if (id && paymentMembershipId && paymentDialog) {
					paymentMembershipId.value = id;
					paymentDialog.showModal();
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
				const name = `${m.first_name ?? ''} ${m.last_name}`.trim();
				const email = m.primary_email ?? '—';
				const rawTier = m.membership_tier_for_year;
				let tierCell = '';
				if (rawTier === 'general') tierCell = tierLabels.general;
				else if (rawTier === 'associate') tierCell = tierLabels.associate;
				else if (rawTier) tierCell = rawTier;
				const href = `${adminMembersBase}/${encodeURIComponent(m.id)}`;
				const rowLabel = `${t(strings, 'adminMemberOpen')}: ${name}`;
				return `<tr data-admin-member-href="${escapeHtml(href)}" tabindex="0" role="link" aria-label="${escapeHtml(rowLabel)}">
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(email)}</td>
          <td>${escapeHtml(tierCell)}</td>
          <td>${escapeHtml(fmtDate(m.created_at))}</td>
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

/** Overview tables — status column (scoped styles apply via `.adminOverviewMount :global`) */
function statusPillHtml(status: string): string {
	const s = status.toLowerCase();
	const cls =
		s === 'active'
			? 'adminStatusPill adminStatusPill--active'
			: s === 'pending'
				? 'adminStatusPill adminStatusPill--pending'
				: 'adminStatusPill adminStatusPill--neutral';
	return `<span class="${cls}">${escapeHtml(status)}</span>`;
}

function fmtDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString();
	} catch {
		return iso;
	}
}
