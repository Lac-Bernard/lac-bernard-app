/** Admin edit member profile (server PATCH). */

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

export function initAdminMemberEdit(strings: AdminConsoleStrings, memberId: string, detailBaseUrl: string) {
	const form = el<HTMLFormElement>('#admin-edit-member-form');
	const statusEl = el<HTMLElement>('#admin-edit-member-status');
	const submitBtn = el<HTMLButtonElement>('#admin-edit-member-submit');

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

	function setLoading(loading: boolean) {
		if (form) form.setAttribute('aria-busy', loading ? 'true' : 'false');
		if (!submitBtn) return;
		submitBtn.classList.toggle('is-loading', loading);
		submitBtn.toggleAttribute('disabled', loading);
	}

	form?.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!form || submitBtn?.disabled) return;
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

		setLoading(true);
		setStatus(t(strings, 'adminLoading'), 'neutral');
		try {
			const { ok, data } = await fetchJson<{ error?: string }>(`/api/admin/members/${encodeURIComponent(memberId)}`, {
				method: 'PATCH',
				body: JSON.stringify(body),
			});
			if (!ok) {
				const code = (data as { error?: string })?.error;
				const msg =
					code === 'first_name_required'
						? t(strings, 'profileErrorFirstName')
						: code === 'last_name_required'
							? t(strings, 'profileErrorLastName')
							: (code ?? t(strings, 'adminErrorGeneric'));
				setStatus(msg, 'error');
				return;
			}
			window.location.href = `${detailBaseUrl}/${encodeURIComponent(memberId)}`;
		} finally {
			setLoading(false);
		}
	});
}
