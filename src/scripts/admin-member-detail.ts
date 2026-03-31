/** Client-side admin member detail page. */

import { formatAdminLocaleDate } from '../lib/admin/formatLocaleDate';
import { formatAdminMemberNameHtml } from '../lib/members/memberDisplayName';
import { computeManualPaymentSplit, roundMoney } from '../lib/admin/manualPaymentSplit';
import { MANUAL_PAYMENT_METHODS, isValidManualPaymentAmount } from '../lib/admin/manualPaymentClient';
import { parseDonationNoteSnippet, perPaymentMembershipDonation, sumYearPaymentBreakdown } from '../lib/admin/paymentBreakdown';
import type { AdminConsoleStrings } from './admin-console';

type MemberRow = {
	id: string;
	created_at: string;
	first_name: string | null;
	secondary_first_name: string | null;
	last_name: string;
	secondary_last_name: string | null;
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

type PaymentRow = {
	id: number;
	created_at: string;
	membership_id: string;
	method: string | null;
	amount: number | null;
	date: string | null;
	notes: string | null;
	payment_id: string | null;
	membership_amount?: number | null;
	donation_amount?: number | null;
	donation_note?: string | null;
};

type MembershipRow = {
	id: string;
	created_at: string;
	member_id: string;
	year: number;
	tier: string;
	status: string;
	payments: PaymentRow[];
};

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

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
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

/** Long Stripe / notes — wrap for word-break; short title for hover preview */
function longCell(s: string | null | undefined): string {
	if (s == null || s === '') return `<span class="adminDetailCellEmpty">—</span>`;
	const e = escapeHtml(s);
	const titleRaw = s.length > 400 ? `${s.slice(0, 400)}…` : s;
	const titleAttr = escapeHtml(titleRaw.replace(/\s+/g, ' ').trim());
	return `<span class="adminDetailCellLong" title="${titleAttr}">${e}</span>`;
}

export function initAdminMemberDetail(
	strings: AdminConsoleStrings,
	tierLabels: { general: string; associate: string },
	memberId: string,
	calendarYear: number,
	numberLocale: string,
) {
	const statusEl = el<HTMLElement>('#admin-detail-status');
	const mount = el<HTMLElement>('#admin-detail-memberships-mount');
	const memberForm = el<HTMLFormElement>('#admin-member-detail-form');
	const paymentDialog = el<HTMLDialogElement>('#admin-payment-dialog');
	const paymentMembershipId = el<HTMLInputElement>('#admin-payment-membership-id');
	const addMembershipDialog = el<HTMLDialogElement>('#admin-add-membership-dialog');
	const addMembershipForm = el<HTMLFormElement>('#admin-add-membership-form');
	const addMsPaidBlock = el<HTMLElement>('#admin-add-ms-paid');

	function setStatus(msg: string, kind: 'neutral' | 'error' | 'success' = 'neutral') {
		if (!statusEl) return;
		if (!msg) {
			statusEl.textContent = '';
			statusEl.removeAttribute('data-error');
			statusEl.removeAttribute('data-success');
			return;
		}
		statusEl.textContent = msg;
		statusEl.dataset.error = kind === 'error' ? '1' : '';
		statusEl.dataset.success = kind === 'success' ? '1' : '';
	}

	const fmtMoney = (n: number) =>
		new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'CAD' }).format(n);

	let allMemberships: MembershipRow[] = [];
	/** After first API load, pin year to calendar year when available (without resetting on later reloads). */
	let appliedInitialYearDefault = false;

	function updatePaymentPreview() {
		const preview = el<HTMLElement>('#admin-payment-split-preview');
		const amtInput = el<HTMLInputElement>('#admin-payment-amount');
		const mid = paymentMembershipId?.value;
		if (!preview || !amtInput || !mid) return;
		const ms = allMemberships.find((m) => m.id === mid);
		if (!ms) {
			preview.hidden = true;
			return;
		}
		const raw = parseFloat(String(amtInput.value ?? ''));
		if (!Number.isFinite(raw) || raw <= 0) {
			preview.hidden = true;
			preview.textContent = '';
			return;
		}
		const sumPaid = (ms.payments ?? []).reduce((s, p) => {
			const v = p.membership_amount;
			const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
			return s + (Number.isFinite(n) ? n : 0);
		}, 0);
		const split = computeManualPaymentSplit({
			amount: roundMoney(raw),
			tier: ms.tier,
			membershipStatus: ms.status,
			sumMembershipPaid: roundMoney(sumPaid),
		});
		preview.hidden = false;
		preview.innerHTML = `${escapeHtml(
			t(strings, 'adminPaymentPreviewMembership', { amount: fmtMoney(split.membershipAmount) }),
		)}<br />${escapeHtml(
			t(strings, 'adminPaymentPreviewDonation', { amount: fmtMoney(split.donationAmount) }),
		)}`;
	}
	let selectedYear = calendarYear;

	function tierLabelFor(ms: MembershipRow): string {
		return ms.tier === 'general'
			? tierLabels.general
			: ms.tier === 'associate'
				? tierLabels.associate
				: ms.tier;
	}

	function getYearOptions(): number[] {
		const set = new Set(allMemberships.map((m) => m.year));
		set.add(calendarYear);
		return [...set].sort((a, b) => b - a);
	}

	function pickDefaultYear(years: number[]): number {
		if (years.length === 0) return calendarYear;
		if (years.includes(calendarYear)) return calendarYear;
		return years[0];
	}

	function fillForm(m: MemberRow) {
		el<HTMLInputElement>('#admin-field-first_name')!.value = m.first_name ?? '';
		el<HTMLInputElement>('#admin-field-last_name')!.value = m.last_name ?? '';
		el<HTMLInputElement>('#admin-field-secondary_first_name')!.value = m.secondary_first_name ?? '';
		el<HTMLInputElement>('#admin-field-secondary_last_name')!.value = m.secondary_last_name ?? '';
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
		const statusSel = el<HTMLSelectElement>('#admin-field-status');
		if (statusSel) {
			const v = (m.status ?? '').trim().toLowerCase();
			if (v === 'new' || v === 'verified' || v === 'disabled') {
				statusSel.value = v;
			} else {
				statusSel.value = 'verified';
			}
		}
		el<HTMLInputElement>('#admin-field-user_id')!.value = m.user_id ?? '';
		const displayNameEl = el<HTMLParagraphElement>('#admin-member-display-name');
		if (displayNameEl) {
			displayNameEl.innerHTML = formatAdminMemberNameHtml(m, escapeHtml);
		}
	}

	function wirePaymentButtons(root: ParentNode) {
		root.querySelectorAll<HTMLButtonElement>('[data-open-payment]').forEach((b) => {
			b.addEventListener('click', () => {
				const id = b.dataset.membershipId;
				if (id && paymentMembershipId && paymentDialog) {
					paymentMembershipId.value = id;
					paymentDialog.showModal();
					queueMicrotask(() => {
						updatePaymentPreview();
						el<HTMLInputElement>('#admin-payment-amount')?.focus();
					});
				}
			});
		});
	}

	function wireDeletePaymentButtons(root: ParentNode) {
		root.querySelectorAll<HTMLButtonElement>('[data-delete-payment]').forEach((b) => {
			b.addEventListener('click', async () => {
				const pid = b.dataset.paymentId;
				if (!pid) return;
				if (!confirm(t(strings, 'adminDeletePaymentConfirm'))) return;
				setStatus(t(strings, 'adminLoading'));
				const { ok, data } = await fetchJson<{ error?: string }>(
					`/api/admin/members/${encodeURIComponent(memberId)}/payments/${encodeURIComponent(pid)}`,
					{ method: 'DELETE' },
				);
				if (!ok) {
					setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
					return;
				}
				setStatus(t(strings, 'adminPaymentDeleted'), 'success');
				void load();
			});
		});
	}

	function syncAddMsPaidVisibility() {
		if (!addMsPaidBlock || !addMembershipDialog) return;
		const initial = addMembershipDialog.querySelector<HTMLInputElement>('input[name="initial"]:checked')?.value;
		addMsPaidBlock.hidden = initial !== 'active_with_payment';
	}

	function addMembershipErrorMessage(code: string | undefined): string {
		if (code === 'no_lake_address') return t(strings, 'adminAddMemberErrorNoLake');
		if (code === 'general_address_taken') return t(strings, 'adminAddMemberErrorAddressTaken');
		if (code === 'already_exists') return t(strings, 'adminAddMemberErrorDuplicateYear');
		return t(strings, 'adminErrorGeneric');
	}

	function wireAddMembershipButtons(root: ParentNode) {
		root.querySelectorAll<HTMLButtonElement>('[data-open-add-membership]').forEach((b) => {
			b.addEventListener('click', () => {
				const y = b.dataset.year;
				const yearInput = el<HTMLInputElement>('#admin-add-ms-year');
				addMembershipForm?.reset();
				if (yearInput && y) {
					yearInput.value = y;
				}
				const pendingRadio = addMembershipDialog?.querySelector<HTMLInputElement>(
					'input[name="initial"][value="pending"]',
				);
				pendingRadio?.click();
				syncAddMsPaidVisibility();
				addMembershipDialog?.showModal();
			});
		});
	}

	function renderYearPanelHtml(): string {
		const ms = allMemberships.find((m) => m.year === selectedYear);
		if (!ms) {
			return `<div class="adminDetailNoMsWrap">
				<p class="adminHint">${escapeHtml(t(strings, 'adminDetailNoMembershipForYear', { year: selectedYear }))}</p>
				<p class="adminDetailAddMsActions"><button type="button" class="adminBtn adminBtn--outline" data-open-add-membership data-year="${selectedYear}">${escapeHtml(t(strings, 'adminAddMembershipOpen'))}</button></p>
			</div>`;
		}

		const tier = tierLabelFor(ms);
		const statusLabel =
			ms.status === 'active'
				? t(strings, 'membershipStatusActive')
				: ms.status === 'pending'
					? t(strings, 'membershipStatusPending')
					: ms.status;
		const statusBadgeClass =
			ms.status === 'active'
				? 'adminDetailBadge adminDetailBadge--status adminDetailBadge--active'
				: ms.status === 'pending'
					? 'adminDetailBadge adminDetailBadge--status adminDetailBadge--pending'
					: 'adminDetailBadge adminDetailBadge--status adminDetailBadge--neutral';

		const bd = sumYearPaymentBreakdown(ms.payments ?? [], ms.tier);
		const remainingDues =
			bd.expectedFee != null ?
				Math.round(Math.max(0, bd.expectedFee - bd.membershipSubtotal) * 100) / 100
			:	0;

		const feeLine =
			bd.expectedFee != null ?
				`<div class="adminDetailSummaryRow">
					<span>${escapeHtml(t(strings, 'adminDetailStandardFee', { tier }))}</span>
					<span class="adminDetailSummaryValue">${escapeHtml(fmtMoney(bd.expectedFee))}</span>
				</div>`
			:	'';

		const balanceRow =
			bd.expectedFee != null && remainingDues > 0 ?
				`<div class="adminDetailSummaryRow adminDetailSummaryRow--balanceDue">
					<span>${escapeHtml(t(strings, 'adminDetailBalanceDue'))}</span>
					<span class="adminDetailSummaryValue adminDetailSummaryValue--due">${escapeHtml(fmtMoney(remainingDues))}</span>
				</div>`
			:	'';

		const duesPaidHint =
			bd.expectedFee != null && remainingDues <= 0 && bd.membershipSubtotal + 0.001 >= (bd.expectedFee ?? 0) ?
				`<p class="adminDetailDuesPaidHint">${escapeHtml(t(strings, 'adminDetailDuesPaidInFull'))}</p>`
			:	'';

		const donationSnippets = [
			...new Set(
				(ms.payments ?? [])
					.map((p) => parseDonationNoteSnippet(p.notes, p.donation_note))
					.filter((x): x is string => Boolean(x)),
			),
		];
		const donationNoteBlock =
			donationSnippets.length > 0 ?
				`<p class="adminDetailDonationNoteLine"><span class="adminDetailDonationNoteLabel">${escapeHtml(t(strings, 'adminDetailDonationNoteLabel'))}</span> ${escapeHtml(donationSnippets.join(' · '))}</p>`
			:	'';

		const summaryStrip = `<div class="adminDetailPaymentSummary" role="group" aria-label="${escapeHtml(t(strings, 'adminDetailPaymentSummaryTitle'))}">
			<div class="adminDetailPaymentSummaryTitleRow">
				<span class="adminDetailPaymentSummaryKicker">${escapeHtml(t(strings, 'adminDetailPaymentSummaryTitle'))}</span>
			</div>
			${feeLine}
			<div class="adminDetailSummaryRow">
				<span>${escapeHtml(t(strings, 'adminDetailAmountMembership'))}</span>
				<span class="adminDetailSummaryValue">${escapeHtml(fmtMoney(bd.membershipSubtotal))}</span>
			</div>
			<div class="adminDetailSummaryRow">
				<span>${escapeHtml(t(strings, 'adminDetailAmountDonation'))}</span>
				<span class="adminDetailSummaryValue">${escapeHtml(fmtMoney(bd.donationSubtotal))}</span>
			</div>
			${balanceRow}
			<div class="adminDetailSummaryRow adminDetailSummaryRow--total">
				<span>${escapeHtml(t(strings, 'adminDetailAmountTotal'))}</span>
				<span class="adminDetailSummaryValue">${escapeHtml(fmtMoney(bd.totalPaid))}</span>
			</div>
			${duesPaidHint}
			${donationNoteBlock}
		</div>`;

		const payRows = (ms.payments ?? [])
			.map((p) => {
				const { membership, donation } = perPaymentMembershipDonation(p, ms.tier);
				return `<tr>
				<td>${escapeHtml(formatAdminLocaleDate(p.date ?? p.created_at))}</td>
				<td>${escapeHtml(methodLabel(strings, p.method))}</td>
				<td>${p.amount != null ? escapeHtml(fmtMoney(p.amount)) : '<span class="adminDetailCellEmpty">—</span>'}</td>
				<td>${escapeHtml(fmtMoney(membership))}</td>
				<td>${escapeHtml(fmtMoney(donation))}</td>
				<td class="adminDetailTdLong">${longCell(p.notes)}</td>
				<td class="adminDetailTdLong">${longCell(p.payment_id)}</td>
				<td class="adminDetailTdActions"><button type="button" class="adminBtn adminBtn--danger adminBtn--table" data-delete-payment data-payment-id="${String(p.id)}">${escapeHtml(t(strings, 'adminDeletePaymentBtn'))}</button></td>
			</tr>`;
			})
			.join('');

		const recordBtn =
			ms.status === 'pending' || ms.status === 'active' ?
				`<button type="button" class="adminBtn adminBtn--solid" data-open-payment data-membership-id="${escapeHtml(ms.id)}">${escapeHtml(t(strings, 'adminRecordPaymentBtn'))}</button>`
			:	'';

		const tableOrEmpty = ms.payments?.length ?
			`<div class="tableWrap adminDetailPaymentsTableWrap adminDetailPaymentsTableBleed"><table class="adminTable adminTable--payments">
				<thead><tr>
					<th>${escapeHtml(t(strings, 'adminTablePaymentDate'))}</th>
					<th>${escapeHtml(t(strings, 'adminMethodLabel'))}</th>
					<th>${escapeHtml(t(strings, 'adminTableAmount'))}</th>
					<th>${escapeHtml(t(strings, 'adminTableDuesPortion'))}</th>
					<th>${escapeHtml(t(strings, 'adminTableDonationPortion'))}</th>
					<th>${escapeHtml(t(strings, 'adminNotesLabel'))}</th>
					<th>${escapeHtml(t(strings, 'adminTablePaymentRef'))}</th>
					<th class="adminDetailThActions">${escapeHtml(t(strings, 'adminTableActions'))}</th>
				</tr></thead>
				<tbody>${payRows}</tbody>
			</table></div>`
		:	`<p class="adminDetailPaymentsEmpty adminDetailPaymentsEmpty--inSection">${escapeHtml(t(strings, 'adminDetailPaymentsEmpty'))}</p>`;

		const recordRow = recordBtn ? `<div class="adminDetailRecordPaymentRow">${recordBtn}</div>` : '';

		const paymentsBlock = `<div class="adminDetailPaymentsSection">
				<div class="adminDetailPaymentsSectionHead">
					<h4 class="adminDetailPaymentsTitle">${escapeHtml(t(strings, 'adminDetailPaymentsHeading'))}</h4>
				</div>
				<div class="adminDetailPaymentsBody">
					${tableOrEmpty}
					${recordRow}
					<div class="adminDetailPaymentSummaryReceipt">${summaryStrip}</div>
				</div>
			</div>`;

		const futureBadge =
			ms.year > calendarYear ?
				`<span class="adminDetailBadge adminDetailBadge--future">${escapeHtml(t(strings, 'adminDetailFutureBadge'))}</span>`
			:	'';

		return `<article class="adminDetailMembershipCard" data-membership-id="${escapeHtml(ms.id)}">
			<header class="adminDetailMembershipHead">
				<div class="adminDetailMembershipIdentity">
					<div class="adminDetailIdentityBlock">
						<span class="adminDetailIdentityLabel">${escapeHtml(t(strings, 'membershipTableType'))}</span>
						<span class="adminDetailIdentityValue adminDetailIdentityValue--tier">${escapeHtml(tier)}</span>
					</div>
					<div class="adminDetailIdentityBlock">
						<span class="adminDetailIdentityLabel">${escapeHtml(t(strings, 'membershipTableStatus'))}</span>
						<span class="${statusBadgeClass} adminDetailBadge--statusEmphasis">${escapeHtml(statusLabel)}</span>
					</div>
					${futureBadge}
				</div>
			</header>
			${paymentsBlock}
		</article>`;
	}

	function renderMembershipMount() {
		if (!mount) return;
		const years = getYearOptions();
		if (!years.includes(selectedYear)) {
			selectedYear = pickDefaultYear(years);
		}

		const opts = years
			.map((y) => `<option value="${y}"${y === selectedYear ? ' selected' : ''}>${y}</option>`)
			.join('');

		mount.innerHTML = `<div class="adminDetailYearToolbar">
			<label class="adminDetailYearToolbarLabel">
				<span class="adminDetailYearToolbarText">${escapeHtml(t(strings, 'adminDetailMembershipYearPicker'))}</span>
				<select id="admin-detail-year-select" class="adminInput adminInput--yearSelect" aria-label="${escapeHtml(t(strings, 'adminDetailMembershipYearPicker'))}">
					${opts}
				</select>
			</label>
		</div>
		<div id="admin-detail-year-panel" class="adminDetailYearPanel">${renderYearPanelHtml()}</div>`;

		wirePaymentButtons(mount);
		wireDeletePaymentButtons(mount);
		wireAddMembershipButtons(mount);
	}

	if (mount) {
		mount.addEventListener('change', (e) => {
			const tgt = e.target as HTMLSelectElement;
			if (tgt?.id !== 'admin-detail-year-select') return;
			selectedYear = parseInt(tgt.value, 10);
			const panel = el<HTMLElement>('#admin-detail-year-panel');
			if (panel) {
				panel.innerHTML = renderYearPanelHtml();
				wirePaymentButtons(panel);
				wireDeletePaymentButtons(panel);
				wireAddMembershipButtons(panel);
			}
		});
	}

	async function load() {
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ member?: MemberRow; memberships?: MembershipRow[]; error?: string }>(
			`/api/admin/members/${encodeURIComponent(memberId)}/detail`,
		);
		if (!ok || !data.member) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			if (mount) mount.innerHTML = '';
			const displayNameEl = el<HTMLParagraphElement>('#admin-member-display-name');
			if (displayNameEl) displayNameEl.innerHTML = '';
			return;
		}
		fillForm(data.member);
		allMemberships = data.memberships ?? [];
		if (!appliedInitialYearDefault) {
			selectedYear = pickDefaultYear(getYearOptions());
			appliedInitialYearDefault = true;
		}
		renderMembershipMount();
		setStatus('');
	}

	memberForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!memberForm) return;
		const fd = new FormData(memberForm);
		const body: Record<string, unknown> = {
			first_name: fd.get('first_name') || null,
			secondary_first_name: fd.get('secondary_first_name') || null,
			last_name: String(fd.get('last_name') ?? '').trim(),
			secondary_last_name: fd.get('secondary_last_name') || null,
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
		const { ok, data } = await fetchJson<{ error?: string }>(`/api/admin/members/${encodeURIComponent(memberId)}`, {
			method: 'PATCH',
			body: JSON.stringify(body),
		});
		if (!ok) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		setStatus(t(strings, 'adminMemberSaved'), 'success');
		void load();
	});

	el<HTMLButtonElement>('#admin-promote-btn')?.addEventListener('click', async () => {
		const userId = el<HTMLInputElement>('#admin-field-user_id')?.value?.trim();
		if (!userId) {
			alert(t(strings, 'adminPromoteNoAccount'));
			return;
		}
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ error?: string }>(
			`/api/admin/members/${encodeURIComponent(memberId)}/promote-admin`,
			{ method: 'POST', body: '{}' },
		);
		if (!ok) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		setStatus(t(strings, 'adminPromoteSuccess'), 'success');
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
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ error?: string }>(
			`/api/admin/memberships/${encodeURIComponent(mid)}/record-payment`,
			{
				method: 'POST',
				body: JSON.stringify({
					amount,
					method,
					date: date || undefined,
					notes: notes || undefined,
					...(reference ? { reference } : {}),
				}),
			},
		);
		if (!ok) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}
		setStatus(t(strings, 'adminPaymentSaved'), 'success');
		paymentDialog?.close();
		form.reset();
		void load();
	});

	el<HTMLInputElement>('#admin-payment-amount')?.addEventListener('input', updatePaymentPreview);

	paymentDialog?.addEventListener('close', () => {
		const preview = el<HTMLElement>('#admin-payment-split-preview');
		if (preview) {
			preview.hidden = true;
			preview.textContent = '';
		}
	});

	el<HTMLButtonElement>('#admin-payment-cancel')?.addEventListener('click', () => {
		paymentDialog?.close();
	});

	addMembershipDialog?.querySelectorAll('input[name="initial"]').forEach((r) => {
		r.addEventListener('change', syncAddMsPaidVisibility);
	});

	addMembershipForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!addMembershipForm) return;
		const fd = new FormData(addMembershipForm);
		const year = parseInt(String(fd.get('year') ?? ''), 10);
		const tier = String(fd.get('tier') ?? '');
		const initial = String(fd.get('initial') ?? '');
		let payment: Record<string, unknown> | undefined;
		if (initial === 'active_with_payment') {
			const amount = parseFloat(String(fd.get('payment_amount') ?? ''));
			const method = String(fd.get('payment_method') ?? '').trim();
			if (!isValidManualPaymentAmount(amount)) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			if (!MANUAL_PAYMENT_METHODS.has(method)) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			const date = String(fd.get('payment_date') ?? '').trim();
			const notes = String(fd.get('payment_notes') ?? '').trim();
			payment = {
				amount,
				method,
				...(date ? { date } : {}),
				...(notes ? { notes } : {}),
			};
		}
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ error?: string }>(
			`/api/admin/members/${encodeURIComponent(memberId)}/memberships`,
			{
				method: 'POST',
				body: JSON.stringify({
					year,
					tier,
					initial,
					...(payment ? { payment } : {}),
				}),
			},
		);
		if (!ok) {
			setStatus(addMembershipErrorMessage(data?.error), 'error');
			return;
		}
		setStatus(t(strings, 'adminMemberSaved'), 'success');
		addMembershipDialog?.close();
		addMembershipForm.reset();
		void load();
	});

	el<HTMLButtonElement>('#admin-add-membership-cancel')?.addEventListener('click', () => {
		addMembershipDialog?.close();
	});

	void load();
}
