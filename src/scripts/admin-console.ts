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
	members: null | {
		id: string;
		first_name: string | null;
		last_name: string;
		primary_email: string | null;
		secondary_email: string | null;
	};
};

type MemberListTab = 'members-active' | 'members-not-renewed';

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

/**
 * Copy after async fetch: `navigator.clipboard` often fails because user activation expires
 * before writeText runs. Prefer synchronous `execCommand('copy')` on a focused textarea.
 */
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

/** `window.prompt` drops long/complex default text in many browsers; use a real textarea. */
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
					/* keep dialog open; user can select manually */
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

export function initAdminConsole(
	strings: AdminConsoleStrings,
	tierLabels: { general: string; associate: string },
	defaultMembershipYear: number,
) {
	const pendingBody = el<HTMLTableSectionElement>('#admin-pending-body');
	const memberForm = el<HTMLFormElement>('#admin-member-form');
	const paymentDialog = el<HTMLDialogElement>('#admin-payment-dialog');
	const paymentMembershipId = el<HTMLInputElement>('#admin-payment-membership-id');
	const memberEditWrap = el<HTMLElement>('#admin-member-edit-wrap');
	statusElGlobal = el<HTMLElement>('#admin-status');
	const tabs = document.querySelectorAll<HTMLButtonElement>('[data-admin-tab]');
	const panels = document.querySelectorAll<HTMLElement>('[data-admin-panel]');

	let membersActivePage = 1;
	let membersActiveTotalPages = 1;
	let membersActiveSort = 'created_at_desc';
	let membersNotRenewedPage = 1;
	let membersNotRenewedTotalPages = 1;
	let membersNotRenewedSort = 'created_at_desc';
	let currentMemberListTab: MemberListTab = 'members-active';
	let previousTabName = 'pending';

	function setStatus(msg: string, kind: 'neutral' | 'error' | 'success' = 'neutral') {
		setStatusGlobal(strings, msg, kind);
	}

	function getMemberListTab(): MemberListTab {
		return currentMemberListTab;
	}

	function membersBody(): HTMLTableSectionElement | null {
		return getMemberListTab() === 'members-active'
			? el<HTMLTableSectionElement>('#admin-members-body-active')
			: el<HTMLTableSectionElement>('#admin-members-body-not-renewed');
	}

	function getMemberFilterYear(): number {
		const sel = getMemberListTab() === 'members-active' ? '#admin-members-year-active' : '#admin-members-year-not-renewed';
		const raw = el<HTMLInputElement>(sel)?.value?.trim() ?? '';
		const n = parseInt(raw, 10);
		return Number.isFinite(n) ? n : defaultMembershipYear;
	}

	function buildMembersListParams(): URLSearchParams {
		const tab = getMemberListTab();
		const isActive = tab === 'members-active';
		const q = (
			isActive ? el<HTMLInputElement>('#admin-members-q-active') : el<HTMLInputElement>('#admin-members-q-not-renewed')
		)?.value?.trim() ?? '';
		const page = isActive ? membersActivePage : membersNotRenewedPage;
		const sort = isActive ? membersActiveSort : membersNotRenewedSort;
		const membership = isActive ? 'active' : 'not_active';
		const tier = isActive ? el<HTMLSelectElement>('#admin-members-tier')?.value ?? 'all' : 'all';

		const params = new URLSearchParams({
			page: String(page),
			limit: '25',
			sort,
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

		if (memberEditWrap) {
			memberEditWrap.hidden = name !== 'members-active' && name !== 'members-not-renewed';
		}

		if (name === 'members-active' && previousTabName === 'members-not-renewed') {
			const y = el<HTMLInputElement>('#admin-members-year-not-renewed')?.value;
			if (y && el<HTMLInputElement>('#admin-members-year-active')) {
				el<HTMLInputElement>('#admin-members-year-active')!.value = y;
			}
		}
		if (name === 'members-not-renewed' && previousTabName === 'members-active') {
			const y = el<HTMLInputElement>('#admin-members-year-active')?.value;
			if (y && el<HTMLInputElement>('#admin-members-year-not-renewed')) {
				el<HTMLInputElement>('#admin-members-year-not-renewed')!.value = y;
			}
		}
		previousTabName = name;

		if (name === 'members-active') {
			currentMemberListTab = 'members-active';
			void loadMembers();
		} else if (name === 'members-not-renewed') {
			currentMemberListTab = 'members-not-renewed';
			void loadMembers();
		} else if (name === 'pending') {
			void loadPending();
		}
	}

	tabs.forEach((btn) => {
		btn.addEventListener('click', () => showTab(btn.dataset.adminTab ?? 'pending'));
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
	});

	el<HTMLButtonElement>('#admin-payment-cancel')?.addEventListener('click', () => paymentDialog?.close());

	el<HTMLFormElement>('#admin-members-active-search')?.addEventListener('submit', (e) => {
		e.preventDefault();
		currentMemberListTab = 'members-active';
		membersActivePage = 1;
		void loadMembers();
	});

	el<HTMLFormElement>('#admin-members-not-renewed-search')?.addEventListener('submit', (e) => {
		e.preventDefault();
		currentMemberListTab = 'members-not-renewed';
		membersNotRenewedPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-sort-active')?.addEventListener('change', (e) => {
		currentMemberListTab = 'members-active';
		membersActiveSort = (e.target as HTMLSelectElement).value;
		membersActivePage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-sort-not-renewed')?.addEventListener('change', (e) => {
		currentMemberListTab = 'members-not-renewed';
		membersNotRenewedSort = (e.target as HTMLSelectElement).value;
		membersNotRenewedPage = 1;
		void loadMembers();
	});

	el<HTMLInputElement>('#admin-members-year-active')?.addEventListener('change', () => {
		currentMemberListTab = 'members-active';
		membersActivePage = 1;
		void loadMembers();
	});
	el<HTMLInputElement>('#admin-members-year-not-renewed')?.addEventListener('change', () => {
		currentMemberListTab = 'members-not-renewed';
		membersNotRenewedPage = 1;
		void loadMembers();
	});

	el<HTMLSelectElement>('#admin-members-tier')?.addEventListener('change', () => {
		currentMemberListTab = 'members-active';
		membersActivePage = 1;
		void loadMembers();
	});

	el<HTMLButtonElement>('#admin-export-emails-active')?.addEventListener('click', () => {
		currentMemberListTab = 'members-active';
		void copyEmailsFromApi(strings, `/api/admin/member-emails-export?${buildMembersExportQueryParams()}`);
	});

	el<HTMLButtonElement>('#admin-export-emails-not-renewed')?.addEventListener('click', () => {
		currentMemberListTab = 'members-not-renewed';
		void copyEmailsFromApi(strings, `/api/admin/member-emails-export?${buildMembersExportQueryParams()}`);
	});

	el<HTMLButtonElement>('#admin-export-emails-pending')?.addEventListener('click', () => {
		void copyEmailsFromApi(strings, '/api/admin/pending-member-emails');
	});

	el<HTMLButtonElement>('#admin-members-prev-active')?.addEventListener('click', () => {
		currentMemberListTab = 'members-active';
		if (membersActivePage > 1) {
			membersActivePage--;
			void loadMembers();
		}
	});
	el<HTMLButtonElement>('#admin-members-next-active')?.addEventListener('click', () => {
		currentMemberListTab = 'members-active';
		if (membersActivePage < membersActiveTotalPages) {
			membersActivePage++;
			void loadMembers();
		}
	});

	el<HTMLButtonElement>('#admin-members-prev-not-renewed')?.addEventListener('click', () => {
		currentMemberListTab = 'members-not-renewed';
		if (membersNotRenewedPage > 1) {
			membersNotRenewedPage--;
			void loadMembers();
		}
	});
	el<HTMLButtonElement>('#admin-members-next-not-renewed')?.addEventListener('click', () => {
		currentMemberListTab = 'members-not-renewed';
		if (membersNotRenewedPage < membersNotRenewedTotalPages) {
			membersNotRenewedPage++;
			void loadMembers();
		}
	});

	el<HTMLButtonElement>('#admin-clear-member')?.addEventListener('click', () => {
		memberForm?.reset();
		el<HTMLInputElement>('#admin-member-id')!.value = '';
	});

	memberForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const id = el<HTMLInputElement>('#admin-member-id')?.value;
		if (!id) {
			setStatus(t(strings, 'adminSelectMemberHint'), 'error');
			return;
		}
		const fd = new FormData(memberForm);
		const body: Record<string, unknown> = {
			first_name: fd.get('first_name') || null,
			last_name: String(fd.get('last_name') ?? '').trim(),
			primary_phone: fd.get('primary_phone') || null,
			secondary_phone: fd.get('secondary_phone') || null,
			lake_phone: fd.get('lake_phone') || null,
			lake_civic_number: fd.get('lake_civic_number') || null,
			lake_street_name: fd.get('lake_street_name') || null,
			primary_address: fd.get('primary_address') || null,
			primary_city: fd.get('primary_city') || null,
			primary_province: fd.get('primary_province') || null,
			primary_country: fd.get('primary_country') || null,
			primary_postal_code: fd.get('primary_postal_code') || null,
			email_opt_in: fd.get('email_opt_in') === 'on',
			notes: fd.get('notes') ?? null,
			secondary_email: fd.get('secondary_email') || null,
			status: fd.get('status') || null,
			user_id: fd.get('user_id') || null,
			primary_email: fd.get('primary_email') || null,
		};
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ error?: string }>(`/api/admin/members/${encodeURIComponent(id)}`, {
			method: 'PATCH',
			body: JSON.stringify(body),
		});
		if (!ok) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		setStatus(t(strings, 'adminMemberSaved'), 'success');
		void loadMembers();
	});

	el<HTMLButtonElement>('#admin-promote-btn')?.addEventListener('click', async () => {
		const id = el<HTMLInputElement>('#admin-member-id')?.value;
		if (!id) return;
		const userId = el<HTMLInputElement>('#admin-field-user_id')?.value?.trim();
		if (!userId) {
			alert(t(strings, 'adminPromoteNoAccount'));
			return;
		}
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ error?: string }>(`/api/admin/members/${encodeURIComponent(id)}/promote-admin`, {
			method: 'POST',
			body: '{}',
		});
		if (!ok) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		setStatus(t(strings, 'adminPromoteSuccess'), 'success');
	});

	async function loadPending() {
		if (!pendingBody) return;
		pendingBody.innerHTML = `<tr><td colspan="6">${t(strings, 'adminLoading')}</td></tr>`;
		const { ok, data } = await fetchJson<{ memberships?: MembershipEmbed[]; error?: string }>(
			'/api/admin/memberships?status=pending&limit=100',
		);
		if (!ok || !data.memberships) {
			pendingBody.innerHTML = `<tr><td colspan="6">${data?.error ?? t(strings, 'adminErrorGeneric')}</td></tr>`;
			return;
		}
		const rows = data.memberships;
		if (rows.length === 0) {
			pendingBody.innerHTML = `<tr><td colspan="6">${t(strings, 'adminPendingEmpty')}</td></tr>`;
			return;
		}
		pendingBody.innerHTML = rows
			.map((m) => {
				const mem = m.members;
				const name = mem ? `${mem.first_name ?? ''} ${mem.last_name}`.trim() : '—';
				const email = mem?.primary_email ?? '—';
				const tier =
					m.tier === 'general' ? tierLabels.general : m.tier === 'associate' ? tierLabels.associate : m.tier;
				return `<tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(email)}</td>
          <td>${m.year}</td>
          <td>${escapeHtml(tier)}</td>
          <td>${escapeHtml(m.status)}</td>
          <td><button type="button" class="adminBtn adminBtn--outline" data-open-payment data-membership-id="${escapeHtml(m.id)}">${t(strings, 'adminRecordPaymentBtn')}</button></td>
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
	}

	async function loadMembers() {
		const body = membersBody();
		if (!body) return;
		body.innerHTML = `<tr><td colspan="5">${t(strings, 'adminLoading')}</td></tr>`;
		const params = buildMembersListParams();
		const { ok, data } = await fetchJson<{
			members?: MemberRow[];
			total?: number;
			page?: number;
			limit?: number;
			error?: string;
		}>(`/api/admin/members?${params}`);
		if (!ok || !data.members) {
			body.innerHTML = `<tr><td colspan="5">${data?.error ?? t(strings, 'adminErrorGeneric')}</td></tr>`;
			return;
		}
		const total = data.total ?? 0;
		const limit = data.limit ?? 25;
		const tab = getMemberListTab();
		if (tab === 'members-active') {
			membersActiveTotalPages = Math.max(1, Math.ceil(total / limit));
			const pageInfo = el('#admin-members-pageinfo-active');
			if (pageInfo) {
				pageInfo.textContent = t(strings, 'adminPageOf', { page: membersActivePage, total: membersActiveTotalPages });
			}
		} else {
			membersNotRenewedTotalPages = Math.max(1, Math.ceil(total / limit));
			const pageInfo = el('#admin-members-pageinfo-not-renewed');
			if (pageInfo) {
				pageInfo.textContent = t(strings, 'adminPageOf', {
					page: membersNotRenewedPage,
					total: membersNotRenewedTotalPages,
				});
			}
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
				return `<tr data-member-id="${escapeHtml(m.id)}" style="cursor:pointer">
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(email)}</td>
          <td>${escapeHtml(tierCell)}</td>
          <td>${escapeHtml(fmtDate(m.created_at))}</td>
          <td><button type="button" class="adminBtn adminBtn--outline">${t(strings, 'adminMemberEditHeading')}</button></td>
        </tr>`;
			})
			.join('');
		body.querySelectorAll('tr[data-member-id]').forEach((row) => {
			row.addEventListener('click', (ev) => {
				const target = ev.target as HTMLElement;
				if (target.closest('button')) return;
				void selectMember(row.getAttribute('data-member-id') ?? '');
			});
			row.querySelector('button')?.addEventListener('click', (e) => {
				e.stopPropagation();
				void selectMember(row.getAttribute('data-member-id') ?? '');
			});
		});
	}

	async function selectMember(id: string) {
		if (!id || !memberForm) return;
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ member?: MemberRow; error?: string }>(`/api/admin/members/${encodeURIComponent(id)}`);
		if (!ok || !data.member) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		const m = data.member;
		el<HTMLInputElement>('#admin-member-id')!.value = m.id;
		el<HTMLInputElement>('#admin-field-first_name')!.value = m.first_name ?? '';
		el<HTMLInputElement>('#admin-field-last_name')!.value = m.last_name ?? '';
		el<HTMLInputElement>('#admin-field-primary_email')!.value = m.primary_email ?? '';
		el<HTMLInputElement>('#admin-field-secondary_email')!.value = m.secondary_email ?? '';
		el<HTMLInputElement>('#admin-field-primary_phone')!.value = m.primary_phone ?? '';
		el<HTMLInputElement>('#admin-field-secondary_phone')!.value = m.secondary_phone ?? '';
		el<HTMLInputElement>('#admin-field-lake_phone')!.value = m.lake_phone ?? '';
		el<HTMLInputElement>('#admin-field-lake_civic_number')!.value = m.lake_civic_number ?? '';
		el<HTMLInputElement>('#admin-field-lake_street_name')!.value = m.lake_street_name ?? '';
		el<HTMLInputElement>('#admin-field-primary_address')!.value = m.primary_address ?? '';
		el<HTMLInputElement>('#admin-field-primary_city')!.value = m.primary_city ?? '';
		el<HTMLInputElement>('#admin-field-primary_province')!.value = m.primary_province ?? '';
		el<HTMLInputElement>('#admin-field-primary_country')!.value = m.primary_country ?? '';
		el<HTMLInputElement>('#admin-field-primary_postal_code')!.value = m.primary_postal_code ?? '';
		el<HTMLInputElement>('#admin-field-email_opt_in')!.checked = m.email_opt_in;
		el<HTMLTextAreaElement>('#admin-field-notes')!.value = m.notes ?? '';
		el<HTMLInputElement>('#admin-field-status')!.value = m.status ?? '';
		el<HTMLInputElement>('#admin-field-user_id')!.value = m.user_id ?? '';
		setStatus('');
	}

	showTab('pending');
}

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function fmtDate(iso: string): string {
	try {
		return new Date(iso).toLocaleDateString();
	} catch {
		return iso;
	}
}
