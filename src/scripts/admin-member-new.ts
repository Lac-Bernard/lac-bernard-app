/** Client-side admin "add member" page. */

import { MANUAL_PAYMENT_METHODS, isValidManualPaymentAmount } from '../lib/admin/manualPaymentClient';
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

export function initAdminMemberNew(
	strings: AdminConsoleStrings,
	adminMemberDetailBase: string,
	calendarYear: number,
) {
	const statusEl = el<HTMLElement>('#admin-new-member-status');
	const form = el<HTMLFormElement>('#admin-new-member-form');
	const createMembership = el<HTMLInputElement>('#admin-new-member-create-membership');
	const paidBlock = el<HTMLElement>('#admin-new-member-paid-fields');

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

	/** Toggle inner membership fields (not the “add membership” checkbox). When off, disable inputs so `required` does not block submit. */
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
	}

	createMembership?.addEventListener('change', syncMembershipFieldsVisibility);

	form?.querySelectorAll('input[name="membership_initial"]').forEach((r) => {
		r.addEventListener('change', syncMembershipFieldsVisibility);
	});

	syncMembershipFieldsVisibility();

	function createErrorMessage(code: string | undefined): string {
		if (code === 'no_lake_address') return t(strings, 'adminAddMemberErrorNoLake');
		if (code === 'voting_address_taken') return t(strings, 'adminAddMemberErrorAddressTaken');
		if (code === 'already_exists') return t(strings, 'adminAddMemberErrorDuplicateYear');
		if (code === 'member_not_found' || code === 'not_found') return t(strings, 'adminAddMemberErrorMemberNotFound');
		return t(strings, 'adminErrorGeneric');
	}

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!form) return;
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
			email_opt_in: fd.get('email_opt_in') === 'on',
			notes: fd.get('notes') ?? null,
			secondary_email: fd.get('secondary_email') || null,
			primary_email: fd.get('primary_email') || null,
		};

		setStatus(t(strings, 'adminLoading'));
		const { ok, data } = await fetchJson<{ member?: { id: string }; error?: string }>('/api/admin/members', {
			method: 'POST',
			body: JSON.stringify(body),
		});
		if (!ok || !data.member?.id) {
			setStatus(data?.error ?? t(strings, 'adminErrorGeneric'), 'error');
			return;
		}

		const memberId = data.member.id;
		const addMs = fd.get('create_membership') === 'on';
		if (addMs) {
			const tier = String(fd.get('membership_tier') ?? '');
			const initial = String(fd.get('membership_initial') ?? '');
			const year = parseInt(String(fd.get('membership_year') ?? calendarYear), 10);
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
			const msRes = await fetchJson<{ error?: string }>(
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
			if (!msRes.ok) {
				const err = (msRes.data as { error?: string })?.error;
				setStatus(createErrorMessage(err), 'error');
				return;
			}
		}

		setStatus('', 'success');
		window.location.href = `${adminMemberDetailBase}/${encodeURIComponent(memberId)}`;
	});
}
