/** Client-side admin "add member" page (redesigned form). */

import type { AdminConsoleStrings } from './admin-console';

function el<T extends HTMLElement>(sel: string): T | null {
	return document.querySelector(sel) as T | null;
}

function t(strings: AdminConsoleStrings, key: string): string {
	return strings[key] ?? key;
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

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

export function initAdminMemberNew(
	strings: AdminConsoleStrings,
	adminMemberDetailBase: string,
	calendarYear: number,
	priorYear: number,
) {
	const statusEl = el<HTMLElement>('#admin-new-member-status');
	const form = el<HTMLFormElement>('#admin-new-member-form');
	const submitBtn = el<HTMLButtonElement>('#admin-new-member-submit');
	const createMembership = el<HTMLInputElement>('#admin-new-member-create-membership');
	const paidBlock = el<HTMLElement>('#admin-new-member-paid-fields');
	const votingWarn = el<HTMLElement>('#admin-new-voting-lake-warn');
	const tierSel = el<HTMLSelectElement>('#admin-new-membership-tier');

	function setStatus(msg: string, kind: 'neutral' | 'error' | 'success' = 'neutral') {
		if (!statusEl) return;
		if (!msg) {
			statusEl.textContent = '';
			statusEl.removeAttribute('data-kind');
			return;
		}
		statusEl.textContent = msg;
		statusEl.dataset.kind = kind === 'error' ? 'error' : kind === 'success' ? 'success' : '';
	}

	function setSubmitLoading(loading: boolean) {
		if (form) form.setAttribute('aria-busy', loading ? 'true' : 'false');
		if (!submitBtn) return;
		submitBtn.classList.toggle('is-loading', loading);
		submitBtn.toggleAttribute('disabled', loading);
	}

	function syncVotingWarning() {
		if (!votingWarn || !tierSel) return;
		const tier = tierSel.value;
		const civic = el<HTMLInputElement>('#am-lake_civic_number')?.value?.trim() ?? '';
		const street = el<HTMLInputElement>('#am-lake_street_name')?.value?.trim() ?? '';
		const place = el<HTMLInputElement>('#am-lake_google_place_id')?.value?.trim() ?? '';
		const hasLake = Boolean((civic && street) || place);
		votingWarn.hidden = tier !== 'voting' || hasLake;
	}

	function syncMembershipFieldsVisibility() {
		const wrap = el<HTMLElement>('#admin-new-member-membership-fields');
		const on = createMembership?.checked ?? false;
		if (wrap) wrap.hidden = !on;

		if (!on) {
			wrap?.querySelectorAll('input, select, textarea').forEach((node) => {
				(node as HTMLInputElement).disabled = true;
			});
			return;
		}

		wrap?.querySelectorAll('input, select, textarea').forEach((node) => {
			(node as HTMLInputElement).disabled = false;
		});

		const initial = el<HTMLInputElement>('input[name="membership_initial"]:checked')?.value;
		const showPaid = initial === 'active_with_payment';
		if (paidBlock) {
			paidBlock.hidden = !showPaid;
			paidBlock.querySelectorAll('input, select, textarea').forEach((node) => {
				(node as HTMLInputElement).disabled = !showPaid;
			});
		}
		const payDate = el<HTMLInputElement>('#admin-new-payment-date');
		if (payDate && showPaid && !payDate.value) payDate.value = todayIsoDate();
		syncVotingWarning();
	}

	createMembership?.addEventListener('change', syncMembershipFieldsVisibility);
	form?.querySelectorAll('input[name="membership_initial"]').forEach((r) => {
		r.addEventListener('change', syncMembershipFieldsVisibility);
	});
	tierSel?.addEventListener('change', syncVotingWarning);
	form?.addEventListener('input', (e) => {
		const t = e.target as HTMLElement;
		if (t?.id?.startsWith?.('am-lake')) syncVotingWarning();
	});

	syncMembershipFieldsVisibility();

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!form) return;
		if (submitBtn?.disabled) return;
		const fd = new FormData(form);
		const body: Record<string, unknown> = {
			first_name: fd.get('first_name') || null,
			secondary_first_name: fd.get('secondary_first_name') || null,
			last_name: String(fd.get('last_name') ?? '').trim(),
			secondary_last_name: fd.get('secondary_last_name') || null,
			primary_phone: fd.get('primary_phone') || null,
			secondary_phone: fd.get('secondary_phone') || null,
			lake_civic_number: fd.get('lake_civic_number') || null,
			lake_street_name: fd.get('lake_street_name') || null,
			lake_address_source: fd.get('lake_address_source') || null,
			lake_google_place_id: fd.get('lake_google_place_id') || null,
			lake_formatted_address: fd.get('lake_formatted_address') || null,
			email_opt_in: fd.get('email_opt_in') === 'on',
			notes: fd.get('notes') ?? null,
			secondary_email: fd.get('secondary_email') || null,
			primary_email: fd.get('primary_email') || null,
		};

		const addMs = fd.get('create_membership') === 'on';
		let membership: Record<string, unknown> | undefined;
		if (addMs) {
			const tier = String(fd.get('membership_tier') ?? '');
			const initial = String(fd.get('membership_initial') ?? '');
			const year = parseInt(String(fd.get('membership_year') ?? calendarYear), 10);
			membership = {
				create: true,
				year,
				tier,
				initial,
			};
			if (initial === 'active_with_payment') {
				const amount = parseFloat(String(fd.get('payment_amount') ?? ''));
				let method = String(fd.get('payment_method') ?? '').trim().toLowerCase();
				if (method === 'other') method = 'unknown';
				if (Number.isNaN(amount) || amount <= 0) {
					setStatus(t(strings, 'adminErrorGeneric'), 'error');
					return;
				}
				if (!['e-transfer', 'cheque', 'cash', 'unknown'].includes(method)) {
					setStatus(t(strings, 'adminErrorGeneric'), 'error');
					return;
				}
				const date = String(fd.get('payment_date') ?? '').trim() || todayIsoDate();
				const reference = String(fd.get('payment_reference') ?? '').trim();
				const donationRaw = String(fd.get('payment_donation_portion') ?? '').trim();
				let donation_portion: number | undefined;
				if (donationRaw !== '') {
					const d = parseFloat(donationRaw);
					if (!Number.isNaN(d)) donation_portion = d;
				}
				membership.payment = {
					amount,
					method,
					date,
					...(reference ? { reference } : {}),
					...(donation_portion !== undefined ? { donation_portion } : {}),
				};
			}
		}

		setSubmitLoading(true);
		setStatus(t(strings, 'adminLoading'), 'neutral');
		try {
			const { ok, data } = await fetchJson<{ member?: { id: string }; error?: string }>('/api/admin/members', {
				method: 'POST',
				body: JSON.stringify({ ...body, ...(membership ? { membership } : {}) }),
			});
			if (!ok || !data.member?.id) {
				setStatus((data as { error?: string })?.error ?? t(strings, 'adminErrorGeneric'), 'error');
				return;
			}

			const memberId = data.member.id;
			setStatus('', 'success');
			window.location.href = `${adminMemberDetailBase}/${encodeURIComponent(memberId)}`;
		} finally {
			setSubmitLoading(false);
		}
	});

	/** Populate year select options */
	const yearSel = el<HTMLSelectElement>('#admin-new-membership-year');
	if (yearSel) {
		yearSel.innerHTML = '';
		for (const y of [calendarYear, priorYear]) {
			const opt = document.createElement('option');
			opt.value = String(y);
			opt.textContent = String(y);
			if (y === calendarYear) opt.selected = true;
			yearSel.appendChild(opt);
		}
	}
}
