/**
 * Admin member detail page (redesign): identity strip, current-year membership,
 * previous years, admin actions, record-payment modal.
 */

import { formatAdminLocaleDate } from '../lib/admin/formatLocaleDate';
import { formatMemberPrimaryName } from '../lib/members/memberDisplayName';
import { computeManualPaymentSplit, roundMoney } from '../lib/admin/manualPaymentSplit';
import { sumYearPaymentBreakdown } from '../lib/admin/paymentBreakdown';
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
	lake_civic_number: string | null;
	lake_street_name: string | null;
	lake_formatted_address: string | null;
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

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
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

export function initAdminMemberDetailV2(
	strings: AdminConsoleStrings,
	tierLabels: { voting: string; associate: string },
	memberId: string,
	calendarYear: number,
	numberLocale: string,
	editProfileUrl: string,
) {
	const statusEl = el<HTMLElement>('#admin-detail-status');
	const mainEl = el<HTMLElement>('#admin-detail-main');
	const paymentDialog = el<HTMLDialogElement>('#admin-payment-dialog');
	const paymentMembershipId = el<HTMLInputElement>('#admin-payment-membership-id');
	const paymentTitle = el<HTMLElement>('#admin-payment-dialog-title');
	const paymentSubtitle = el<HTMLElement>('#admin-payment-dialog-subtitle');
	const addMembershipDialog = el<HTMLDialogElement>('#admin-add-membership-dialog');
	const addMembershipForm = el<HTMLFormElement>('#admin-add-membership-form');
	const addMsPaidBlock = el<HTMLElement>('#admin-add-ms-paid');
	const savePaymentBtn = el<HTMLButtonElement>('#admin-payment-submit');
	const addMembershipSubmitBtn = el<HTMLButtonElement>('#admin-add-membership-submit');

	let currentMember: MemberRow | null = null;
	let allMemberships: MembershipRow[] = [];

	const fmtMoney = (n: number) =>
		new Intl.NumberFormat(numberLocale, { style: 'currency', currency: 'CAD' }).format(n);

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

	function tierLabel(ms: MembershipRow): string {
		return ms.tier === 'voting' ? tierLabels.voting : ms.tier === 'associate' ? tierLabels.associate : ms.tier;
	}

	function methodLabel(m: string | null): string {
		if (!m) return '—';
		if (m === 'stripe') return t(strings, 'adminMethodStripe');
		if (m === 'e-transfer') return t(strings, 'adminMethodEtransfer');
		if (m === 'cheque') return t(strings, 'adminMethodCheque');
		if (m === 'cash') return t(strings, 'adminMethodCash');
		if (m === 'unknown') return t(strings, 'adminMethodOther');
		return m;
	}

	function memberSinceYear(): number {
		if (!currentMember?.created_at) return calendarYear;
		return new Date(currentMember.created_at).getFullYear();
	}

	function lakeLine(): string {
		if (!currentMember) return '—';
		if (currentMember.lake_formatted_address?.trim()) return currentMember.lake_formatted_address.trim();
		const c = currentMember.lake_civic_number?.trim();
		const s = currentMember.lake_street_name?.trim();
		if (c || s) return `${c ?? ''} ${s ?? ''}`.trim();
		return '—';
	}

	function renderIdentity(): string {
		if (!currentMember) return '';
		const name = escapeHtml(formatMemberPrimaryName(currentMember));
		const dis = currentMember.status === 'disabled';
		const notice = dis
			? `<div class="adminDetailDisabledBanner"><span>${escapeHtml(t(strings, 'adminDisabledNotice'))}</span>
				<button type="button" class="adminBtn adminBtn--ghost adminBtn--small" id="admin-detail-re-enable">${escapeHtml(t(strings, 'adminReEnable'))}</button></div>`
			: '';

		const email = currentMember.primary_email?.trim();
		const emailLine = email
			? `<a class="adminDetailEmailLink" href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
			: escapeHtml(t(strings, 'adminNoEmailDash'));

		const optInVal = currentMember.email_opt_in
			? escapeHtml(t(strings, 'adminEmailOptInYes'))
			: `<span class="adminDetailMutedSmall">${escapeHtml(t(strings, 'adminEmailOptInNo'))}</span>`;
		const optInRow = `<div class="adminDetailField"><span class="adminDetailFieldLabel">${escapeHtml(t(strings, 'adminDetailEmailOptInLabel'))}</span><span>${optInVal}</span></div>`;

		const phone = currentMember.primary_phone?.trim();
		const phoneRow = phone
			? `<div class="adminDetailField"><span class="adminDetailFieldLabel">${escapeHtml(t(strings, 'profilePrimaryPhone'))}</span><span>${escapeHtml(phone)}</span></div>`
			: '';

		const sec =
			[currentMember.secondary_first_name, currentMember.secondary_last_name].filter(Boolean).join(' ').trim() ||
			currentMember.secondary_email?.trim();
		const secRow =
			sec ?
				`<div class="adminDetailField"><span class="adminDetailFieldLabel">${escapeHtml(t(strings, 'adminSecondaryContactSection'))}</span><span>${escapeHtml(sec)}${
					currentMember.secondary_email?.trim() ? ` · ${escapeHtml(currentMember.secondary_email.trim())}` : ''
				}</span></div>`
			:	'';

		const notes = (currentMember.notes ?? '').trim();
		const notesRow =
			notes ?
				`<div class="adminDetailField adminDetailField--notes" data-notes="${escapeHtml(notes)}"><span class="adminDetailFieldLabel">${escapeHtml(t(strings, 'adminNotesFieldLabel'))}</span><span class="adminDetailNotesPreview"></span></div>`
			:	'';

		return `<div class="adminDetailIdentity">
			<div class="adminDetailIdentityTop">
				<div>
					<p class="adminDetailName">${name}</p>
					<p class="adminDetailSince">${escapeHtml(t(strings, 'adminMemberSince', { year: memberSinceYear() }))}</p>
					${notice}
				</div>
				<div class="adminDetailIdentityActions">
					<a class="adminBtn adminBtn--ghost adminBtn--small" href="${escapeHtml(editProfileUrl)}">${escapeHtml(t(strings, 'adminEditProfile'))}</a>
				</div>
			</div>
			<div class="adminDetailFieldsRow">
				<div class="adminDetailField"><span class="adminDetailFieldLabel">${escapeHtml(t(strings, 'adminPrimaryEmailLabel'))}</span><span>${emailLine}</span></div>
				${phoneRow}
				${optInRow}
				<div class="adminDetailField"><span class="adminDetailFieldLabel">${escapeHtml(t(strings, 'profileSectionLake'))}</span><span>${escapeHtml(lakeLine())}</span></div>
				${secRow}
				${notesRow}
			</div>
		</div>`;
	}

	function renderCurrentYear(ms: MembershipRow | undefined): string {
		const y = calendarYear;
		const heading = escapeHtml(t(strings, 'adminMembershipYearHeading', { year: y }));
		if (!ms) {
			return `<section class="adminDetailSection"><h2 class="adminMemberSectionLabel">${heading}</h2>
				<div class="adminDetailMsCard adminDetailMsCard--dashed">
					<p class="adminDetailMuted">${escapeHtml(t(strings, 'adminNoMembershipYear', { year: y }))}</p>
					<div class="adminDetailRowBtns">
						<button type="button" class="adminBtn adminBtn--solid" data-add-ms-tier="voting">${escapeHtml(t(strings, 'adminAddVotingMembership'))}</button>
						<button type="button" class="adminBtn adminBtn--solid" data-add-ms-tier="associate">${escapeHtml(t(strings, 'adminAddAssociateMembership'))}</button>
					</div>
				</div></section>`;
		}

		const tier = tierLabel(ms);
		const badgeClass = ms.tier === 'voting' ? 'adminTierBadge adminTierBadge--voting' : 'adminTierBadge adminTierBadge--associate';
		const bd = sumYearPaymentBreakdown(ms.payments ?? [], ms.tier);

		if (ms.status === 'pending') {
			return `<section class="adminDetailSection"><h2 class="adminMemberSectionLabel">${heading}</h2>
				<div class="adminDetailMsCard">
					<header class="adminDetailMsHead">
						<div class="adminDetailMsHeadMain"><span class="adminDetailMsHeadYear">${y}</span><span class="${badgeClass}">${escapeHtml(tier)}</span></div>
						<span class="adminPendingPill adminPendingPill--header">${escapeHtml(t(strings, 'membershipStatusPending'))}</span>
					</header>
					<div class="adminDetailMsBody">
						<p class="adminDetailMuted">${escapeHtml(t(strings, 'adminAwaitingPayment', { date: formatAdminLocaleDate(ms.created_at) }))}</p>
						<button type="button" class="adminBtn adminBtn--solid adminDetailFullBtn" data-open-payment data-membership-id="${escapeHtml(ms.id)}">${escapeHtml(t(strings, 'adminRecordPaymentBtn'))}</button>
						<p class="adminDetailMuted" style="margin-top:0.75rem;"><button type="button" class="adminBtn adminBtn--link" data-cancel-pending="${escapeHtml(ms.id)}">${escapeHtml(t(strings, 'adminCancelPendingMembership'))}</button></p>
					</div>
				</div></section>`;
		}

		/** active */
		const payRows = (ms.payments ?? [])
			.map((p) => {
				const ref = [p.payment_id, p.notes].filter(Boolean).join(' · ');
				const mem = p.membership_amount ?? 0;
				const don = p.donation_amount ?? 0;
				const splitLine =
					don > 0.001 ?
						`<div class="adminDetailMutedSmall">${escapeHtml(fmtMoney(mem))} dues · ${escapeHtml(fmtMoney(don))} donation</div>`
					:	'';
				const del =
					p.method !== 'stripe' ?
						`<button type="button" class="adminDetailPayDel" data-delete-payment="${String(p.id)}" aria-label="${escapeHtml(t(strings, 'adminDeletePaymentBtn'))}">×</button>`
					:	'';
				const methodShown = p.method === 'stripe' ? t(strings, 'adminCardPaymentStripe') : methodLabel(p.method);
				return `<div class="adminDetailPayRow">
					<div>
						<div>${escapeHtml(methodShown)}</div>
						<div class="adminDetailMutedSmall">${escapeHtml(formatAdminLocaleDate(p.date ?? p.created_at))}${ref ? ` · ${escapeHtml(ref)}` : ''}</div>
					</div>
					<div class="adminDetailPayAmt">${escapeHtml(fmtMoney(p.amount ?? 0))}${splitLine}</div>
					${del}
				</div>`;
			})
			.join('');

		const totalLine =
			bd.donationSubtotal > 0 ?
				`<div class="adminDetailMutedSmall">${escapeHtml(t(strings, 'adminDuesDonationLine', { dues: fmtMoney(bd.membershipSubtotal), don: fmtMoney(bd.donationSubtotal) }))}</div>`
			:	'';

		return `<section class="adminDetailSection"><h2 class="adminMemberSectionLabel">${heading}</h2>
			<div class="adminDetailMsCard">
				<header class="adminDetailMsHead">
					<div class="adminDetailMsHeadMain"><span class="adminDetailMsHeadYear">${y}</span><span class="${badgeClass}">${escapeHtml(tier)}</span></div>
				</header>
				<div class="adminDetailMsBody">${payRows || `<p class="adminDetailMuted">${escapeHtml(t(strings, 'adminDetailPaymentsEmpty'))}</p>`}
					<div class="adminDetailPaySummary">
						<span class="adminDetailMuted">${escapeHtml(t(strings, 'adminTotalReceived'))}</span>
						<strong>${escapeHtml(fmtMoney(bd.totalPaid))}</strong>
						${totalLine}
					</div>
					<button type="button" class="adminBtn adminBtn--solid adminDetailFullBtn" data-open-payment data-membership-id="${escapeHtml(ms.id)}">${escapeHtml(t(strings, 'adminRecordPaymentBtn'))}</button>
				</div>
			</div></section>`;
	}

	function renderPrevious(): string {
		const prev = [...allMemberships].filter((m) => m.year < calendarYear).sort((a, b) => b.year - a.year);
		if (prev.length === 0) return '';
		const accordionHtml = prev
			.map((m) => {
				const bd = sumYearPaymentBreakdown(m.payments ?? [], m.tier);
				const total = bd.totalPaid;
				const pending = m.status === 'pending';
				const badgeClass = m.tier === 'voting' ? 'adminTierBadge adminTierBadge--voting' : 'adminTierBadge adminTierBadge--associate';
				return `<details class="adminDetailAccordion"><summary class="adminDetailAccordionSum">
					<span>${m.year}</span>
					<span class="${badgeClass}">${escapeHtml(tierLabel(m))}</span>
					<span>${pending ? `<span class="adminPendingPill">${escapeHtml(t(strings, 'membershipStatusPending'))}</span>` : escapeHtml(fmtMoney(total))}</span>
					<span class="adminDetailChev" aria-hidden="true">›</span>
				</summary>
				<div class="adminDetailAccordionBody">
					${(m.payments ?? [])
						.map(
							(p) =>
								`<div class="adminDetailPayRow adminDetailPayRow--compact"><span>${escapeHtml(methodLabel(p.method))}</span><span>${escapeHtml(formatAdminLocaleDate(p.date ?? p.created_at))}</span><span>${escapeHtml(fmtMoney(p.amount ?? 0))}</span></div>`,
						)
						.join('')}
				</div></details>`;
			})
			.join('');
		return `<section class="adminDetailSection"><h2 class="adminMemberSectionLabel">${escapeHtml(t(strings, 'adminPreviousYears'))}</h2>${accordionHtml}
			<p style="margin-top:0.75rem;"><button type="button" class="adminBtn adminBtn--ghost adminBtn--small" id="admin-open-add-year">${escapeHtml(t(strings, 'adminAddYearMembership'))}</button></p>
		</section>`;
	}

	function renderAdminActions(): string {
		if (!currentMember) return '';
		const dis = currentMember.status === 'disabled';
		const disableBtn = dis
			? `<button type="button" class="adminBtn adminBtn--ghost" id="admin-enable-member">${escapeHtml(t(strings, 'adminEnableMember'))}</button>`
			: `<button type="button" class="adminBtn adminBtn--dangerOutline" id="admin-disable-member">${escapeHtml(t(strings, 'adminDisableMember'))}</button>`;
		const noUser = !currentMember.user_id;
		const grant = `<button type="button" class="adminBtn adminBtn--ghost" id="admin-grant-admin" ${noUser ? 'disabled title="' + escapeHtml(t(strings, 'adminGrantAdminNoUser')) + '"' : ''}>${escapeHtml(t(strings, 'adminGrantAdmin'))}</button>`;
		return `<section class="adminDetailSection adminDetailSection--admin">
			<h2 class="adminMemberSectionLabel adminDetailAdminLabel">${escapeHtml(t(strings, 'adminAdminActionsLabel'))}</h2>
			<div class="adminDetailAdminBtns">${disableBtn}${grant}</div>
			<p class="adminDetailMutedSmall">${escapeHtml(t(strings, 'adminAdminActionsFootnote'))}</p>
		</section>`;
	}

	function wireNotesPreview(root: ParentNode) {
		root.querySelectorAll<HTMLElement>('.adminDetailField--notes').forEach((row) => {
			const full = row.dataset.notes ?? '';
			const prev = row.querySelector('.adminDetailNotesPreview');
			if (!prev || full.length <= 60) {
				if (prev) prev.textContent = full;
				return;
			}
			const short = full.slice(0, 60) + '…';
			prev.innerHTML = `${escapeHtml(short)} <button type="button" class="adminBtn adminBtn--link adminDetailNotesToggle">${escapeHtml(t(strings, 'adminNotesView'))}</button>`;
			prev.querySelector('button')?.addEventListener('click', () => {
				prev.textContent = full;
			});
		});
	}

	function renderAll() {
		if (!mainEl || !currentMember) return;
		const cur = allMemberships.find((m) => m.year === calendarYear);
		mainEl.innerHTML = renderIdentity() + renderCurrentYear(cur) + renderPrevious() + renderAdminActions();
		wireNotesPreview(mainEl);

		mainEl.querySelector('#admin-detail-re-enable')?.addEventListener('click', async () => {
			if (!confirm(t(strings, 'adminConfirmEnable'))) return;
			setStatus(t(strings, 'adminLoading'));
			const { ok } = await fetchJson(`/api/admin/members/${encodeURIComponent(memberId)}/enable`, { method: 'POST' });
			if (!ok) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			void load();
		});

		mainEl.querySelector('#admin-disable-member')?.addEventListener('click', async () => {
			if (!confirm(t(strings, 'adminConfirmDisable'))) return;
			const { ok } = await fetchJson(`/api/admin/members/${encodeURIComponent(memberId)}/disable`, { method: 'POST' });
			if (!ok) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			void load();
		});

		mainEl.querySelector('#admin-enable-member')?.addEventListener('click', async () => {
			if (!confirm(t(strings, 'adminConfirmEnable'))) return;
			const { ok } = await fetchJson(`/api/admin/members/${encodeURIComponent(memberId)}/enable`, { method: 'POST' });
			if (!ok) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			void load();
		});

		mainEl.querySelector('#admin-grant-admin')?.addEventListener('click', async () => {
			if (!currentMember?.user_id) return;
			if (!confirm(t(strings, 'adminConfirmGrantAdmin'))) return;
			const { ok } = await fetchJson(`/api/admin/members/${encodeURIComponent(memberId)}/promote-admin`, { method: 'POST', body: '{}' });
			if (!ok) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			setStatus(t(strings, 'adminPromoteSuccess'), 'success');
		});

		mainEl.querySelectorAll('[data-open-payment]').forEach((b) => {
			b.addEventListener('click', () => {
				const id = (b as HTMLButtonElement).dataset.membershipId;
				if (id && paymentMembershipId && paymentDialog) {
					paymentMembershipId.value = id;
					const ms = allMemberships.find((m) => m.id === id);
					if (paymentTitle) paymentTitle.textContent = t(strings, 'adminRecordPaymentTitle');
					if (paymentSubtitle && ms && currentMember) {
						paymentSubtitle.textContent = t(strings, 'adminRecordPaymentSubtitle', {
							name: formatMemberPrimaryName(currentMember),
							year: ms.year,
							tier: tierLabel(ms),
						});
					}
					paymentDialog.showModal();
					const dateIn = el<HTMLInputElement>('#admin-payment-form input[name="date"]');
					if (dateIn && !dateIn.value) dateIn.value = new Date().toISOString().slice(0, 10);
					el<HTMLInputElement>('#admin-payment-amount')?.focus();
				}
			});
		});

		mainEl.querySelectorAll('[data-delete-payment]').forEach((b) => {
			b.addEventListener('click', async () => {
				const pid = (b as HTMLButtonElement).dataset.deletePayment;
				if (!pid) return;
				if (!confirm(t(strings, 'adminConfirmDeletePayment'))) return;
				const { ok } = await fetchJson(`/api/admin/members/${encodeURIComponent(memberId)}/payments/${encodeURIComponent(pid)}`, {
					method: 'DELETE',
				});
				if (!ok) {
					setStatus(t(strings, 'adminErrorGeneric'), 'error');
					return;
				}
				void load();
			});
		});

		mainEl.querySelectorAll('[data-cancel-pending]').forEach((b) => {
			b.addEventListener('click', async () => {
				const mid = (b as HTMLButtonElement).dataset.cancelPending;
				if (!mid) return;
				if (!confirm(t(strings, 'adminCancelPendingConfirm'))) return;
				const { ok } = await fetchJson(`/api/admin/memberships/${encodeURIComponent(mid)}/cancel-pending`, { method: 'POST' });
				if (!ok) {
					setStatus(t(strings, 'adminErrorGeneric'), 'error');
					return;
				}
				void load();
			});
		});

		mainEl.querySelectorAll('[data-add-ms-tier]').forEach((b) => {
			b.addEventListener('click', async () => {
				const tier = (b as HTMLButtonElement).dataset.addMsTier as 'voting' | 'associate';
				setStatus(t(strings, 'adminLoading'));
				const { ok } = await fetchJson(`/api/admin/members/${encodeURIComponent(memberId)}/memberships`, {
					method: 'POST',
					body: JSON.stringify({ year: calendarYear, tier, initial: 'pending' }),
				});
				if (!ok) {
					setStatus(t(strings, 'adminErrorGeneric'), 'error');
					return;
				}
				void load();
			});
		});

		mainEl.querySelector('#admin-open-add-year')?.addEventListener('click', () => {
			addMembershipForm?.reset();
			const yIn = el<HTMLInputElement>('#admin-add-ms-year');
			if (yIn) yIn.value = String(calendarYear - 1);
			syncAddMsPaidVisibility();
			addMembershipDialog?.showModal();
		});
	}

	function syncAddMsPaidVisibility() {
		if (!addMsPaidBlock || !addMembershipDialog) return;
		const initial = addMembershipDialog.querySelector<HTMLInputElement>('input[name="initial"]:checked')?.value;
		addMsPaidBlock.hidden = initial !== 'active_with_payment';
	}

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
		preview.innerHTML = `${escapeHtml(t(strings, 'adminPaymentPreviewMembership', { amount: fmtMoney(split.membershipAmount) }))}<br />${escapeHtml(
			t(strings, 'adminPaymentPreviewDonation', { amount: fmtMoney(split.donationAmount) }),
		)}`;
	}

	addMembershipDialog?.querySelectorAll('input[name="initial"]').forEach((r) => {
		r.addEventListener('change', syncAddMsPaidVisibility);
	});

	el<HTMLFormElement>('#admin-payment-form')?.addEventListener('submit', async (e) => {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		if (savePaymentBtn?.disabled) return;
		const fd = new FormData(form);
		let method = String(fd.get('method') ?? '').trim().toLowerCase();
		if (method === 'other') method = 'unknown';
		const amount = parseFloat(String(fd.get('amount') ?? ''));
		const date = String(fd.get('date') ?? '').trim();
		const reference = String(fd.get('reference') ?? '').trim();
		const donationRaw = String(fd.get('donation_portion') ?? '').trim();
		let donation_portion: number | undefined;
		if (donationRaw !== '') {
			const d = parseFloat(donationRaw);
			if (!Number.isNaN(d)) donation_portion = d;
		}
		const mid = paymentMembershipId?.value;
		if (!mid || !savePaymentBtn) return;
		savePaymentBtn.classList.add('is-loading');
		savePaymentBtn.disabled = true;
		try {
			const { ok } = await fetchJson(`/api/admin/memberships/${encodeURIComponent(mid)}/record-payment`, {
				method: 'POST',
				body: JSON.stringify({
					amount,
					method,
					date: date || undefined,
					...(reference ? { reference } : {}),
					...(donation_portion !== undefined ? { donation_portion } : {}),
				}),
			});
			if (!ok) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			paymentDialog?.close();
			form.reset();
			void load();
		} finally {
			savePaymentBtn.classList.remove('is-loading');
			savePaymentBtn.disabled = false;
		}
	});

	el<HTMLInputElement>('#admin-payment-amount')?.addEventListener('input', updatePaymentPreview);
	el<HTMLButtonElement>('#admin-payment-cancel')?.addEventListener('click', () => paymentDialog?.close());
	paymentDialog?.addEventListener('click', (ev) => {
		if (ev.target === paymentDialog) paymentDialog.close();
	});

	addMembershipForm?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!addMembershipForm || addMembershipSubmitBtn?.disabled) return;
		const fd = new FormData(addMembershipForm);
		const year = parseInt(String(fd.get('year') ?? ''), 10);
		const tier = String(fd.get('tier') ?? '');
		const initial = String(fd.get('initial') ?? '');
		let payment: Record<string, unknown> | undefined;
		if (initial === 'active_with_payment') {
			const amount = parseFloat(String(fd.get('payment_amount') ?? ''));
			let method = String(fd.get('payment_method') ?? '').trim().toLowerCase();
			if (method === 'other') method = 'unknown';
			const date = String(fd.get('payment_date') ?? '').trim();
			const reference = String(fd.get('payment_reference') ?? '').trim();
			const donationRaw = String(fd.get('payment_donation_portion') ?? '').trim();
			let donation_portion: number | undefined;
			if (donationRaw !== '') {
				const d = parseFloat(donationRaw);
				if (!Number.isNaN(d)) donation_portion = d;
			}
			payment = {
				amount,
				method,
				...(date ? { date } : {}),
				...(reference ? { reference } : {}),
				...(donation_portion !== undefined ? { donation_portion } : {}),
			};
		}
		if (!addMembershipSubmitBtn) return;
		addMembershipSubmitBtn.classList.add('is-loading');
		addMembershipSubmitBtn.disabled = true;
		try {
			const { ok } = await fetchJson(`/api/admin/members/${encodeURIComponent(memberId)}/memberships`, {
				method: 'POST',
				body: JSON.stringify({ year, tier, initial, ...(payment ? { payment } : {}) }),
			});
			if (!ok) {
				setStatus(t(strings, 'adminErrorGeneric'), 'error');
				return;
			}
			addMembershipDialog?.close();
			addMembershipForm.reset();
			void load();
		} finally {
			addMembershipSubmitBtn.classList.remove('is-loading');
			addMembershipSubmitBtn.disabled = false;
		}
	});

	el<HTMLButtonElement>('#admin-add-membership-cancel')?.addEventListener('click', () => addMembershipDialog?.close());
	addMembershipDialog?.addEventListener('click', (ev) => {
		if (ev.target === addMembershipDialog) addMembershipDialog.close();
	});

	async function load() {
		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ member?: MemberRow; memberships?: MembershipRow[]; error?: string }>(
			`/api/admin/members/${encodeURIComponent(memberId)}/detail`,
		);
		if (!ok || !data.member) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			if (mainEl) mainEl.innerHTML = '';
			return;
		}
		currentMember = data.member;
		allMemberships = data.memberships ?? [];
		renderAll();
		setStatus('');
	}

	void load();
}
