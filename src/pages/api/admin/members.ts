export const prerender = false;
import type { APIRoute } from 'astro';
import { roundMoney } from '../../../lib/admin/manualPaymentSplit';
import { insertAdminAudit } from '../../../lib/admin/audit';
import { adminPatchToRow, parseAdminMemberPatch } from '../../../lib/admin/memberUpdate';
import { parseAdminMemberListFilters } from '../../../lib/admin/memberListFilters';
import { parseAdminMemberIndexParams } from '../../../lib/admin/memberIndexParams';
import { requireAdminSession } from '../../../lib/admin/session';
import { createSupabaseServiceRoleClient } from '../../../lib/supabase/service';

const MAX_LIMIT = 100;

export const GET: APIRoute = async ({ request, cookies, url }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	const searchParams = url.searchParams;
	const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
	const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10) || 25));
	const offset = (page - 1) * limit;

	const service = createSupabaseServiceRoleClient();

	if (searchParams.has('view')) {
		const ix = parseAdminMemberIndexParams(searchParams);
		const { data: rpcData, error: rpcError } = await service.rpc('admin_member_index', {
			p_view: ix.view,
			p_year: ix.year,
			p_lapsed_since: ix.lapsedSince,
			p_include_disabled: ix.includeDisabled,
			p_q: ix.q || null,
			p_sort: ix.sort,
			p_limit: limit,
			p_offset: offset,
		});

		if (rpcError) {
			return new Response(JSON.stringify({ error: 'query_failed', detail: rpcError.message }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const payload = rpcData as {
			members?: unknown[];
			total?: number;
			counts?: Record<string, number>;
			email_opt_in_count?: number | null;
			search_disabled_matches?: number;
			error?: string;
		} | null;

		if (payload?.error) {
			return new Response(JSON.stringify({ error: payload.error }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const members = Array.isArray(payload?.members) ? payload!.members : [];
		const total = typeof payload?.total === 'number' ? payload!.total : 0;

		// counts.pending must stay aligned with GET /api/admin/activity counts.pendingMemberships (admin_pending_membership_count + admin_member_index pending_f).
		return new Response(
			JSON.stringify({
				members,
				total,
				page,
				limit,
				index: {
					view: ix.view,
					year: ix.year,
					lapsedSince: ix.lapsedSince,
					counts: payload?.counts ?? {},
					emailOptInCount: payload?.email_opt_in_count ?? null,
					searchDisabledMatches: typeof payload?.search_disabled_matches === 'number' ? payload.search_disabled_matches : 0,
				},
			}),
			{ status: 200, headers: { 'Content-Type': 'application/json' } },
		);
	}

	const { year, membership, tier, memberStatus, q } = parseAdminMemberListFilters(searchParams);
	const sort = searchParams.get('sort') ?? 'created_at_desc';

	const { data: rpcData, error: rpcError } = await service.rpc('admin_members_page', {
		p_year: year,
		p_membership: membership,
		p_tier: tier,
		p_member_status: memberStatus,
		p_q: q || null,
		p_sort: sort,
		p_limit: limit,
		p_offset: offset,
	});

	if (rpcError) {
		return new Response(JSON.stringify({ error: 'query_failed', detail: rpcError.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const payload = rpcData as {
		members?: unknown[];
		total?: number;
		error?: string;
	} | null;

	if (payload?.error === 'invalid_membership_filter') {
		return new Response(JSON.stringify({ error: 'invalid_membership_filter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (payload?.error === 'invalid_tier_filter') {
		return new Response(JSON.stringify({ error: 'invalid_tier_filter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	if (payload?.error === 'invalid_member_status_filter') {
		return new Response(JSON.stringify({ error: 'invalid_member_status_filter' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const members = Array.isArray(payload?.members) ? payload!.members : [];
	const total = typeof payload?.total === 'number' ? payload!.total : 0;

	return new Response(
		JSON.stringify({
			members,
			total,
			page,
			limit,
			year,
			membership,
			tier,
			memberStatus,
		}),
		{ status: 200, headers: { 'Content-Type': 'application/json' } },
	);
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const auth = await requireAdminSession(request, cookies);
	if (!auth.ok) return auth.response;

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'invalid_json' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const raw = body as Record<string, unknown>;
	const membershipPayload = raw.membership;
	const memberBody: Record<string, unknown> = { ...raw };
	delete memberBody.membership;

	const parsed = parseAdminMemberPatch(memberBody);
	if (!parsed.ok) {
		return new Response(JSON.stringify({ error: parsed.error }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const row = adminPatchToRow(parsed.value);
	if (!Object.prototype.hasOwnProperty.call(parsed.value, 'user_id')) {
		row.user_id = null;
	}
	/** Admin-created members are directory-ready unless status was explicitly set. */
	if (!Object.prototype.hasOwnProperty.call(parsed.value, 'status')) {
		row.status = 'enrolled';
	}

	const service = createSupabaseServiceRoleClient();
	const { data: inserted, error } = await service.from('members').insert(row).select('id').maybeSingle();

	if (error) {
		return new Response(JSON.stringify({ error: 'insert_failed', detail: error.message }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!inserted?.id) {
		return new Response(JSON.stringify({ error: 'insert_failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const memberId = inserted.id;
	let createdWithMembership = false;
	let createdWithPayment = false;
	let recordPaymentAudit:
		| {
				paymentId: number;
				membershipId: string | null;
				amount: number;
				method: string | null;
				auditDate: string;
		  }
		| undefined;

	if (membershipPayload != null && typeof membershipPayload === 'object') {
		const ms = membershipPayload as Record<string, unknown>;
		const wantMembership = ms.create !== false;
		if (wantMembership) {
			const yearRaw = ms.year;
			const year = typeof yearRaw === 'number' ? yearRaw : parseInt(String(yearRaw ?? ''), 10);
			const tier = typeof ms.tier === 'string' ? ms.tier.trim() : '';
			const initial = typeof ms.initial === 'string' ? ms.initial.trim() : '';
			if (!Number.isFinite(year) || year < 2000 || year > 2100 || (tier !== 'voting' && tier !== 'associate')) {
				await service.from('members').delete().eq('id', memberId);
				return new Response(JSON.stringify({ error: 'invalid_membership' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			if (initial !== 'pending' && initial !== 'active_with_payment') {
				await service.from('members').delete().eq('id', memberId);
				return new Response(JSON.stringify({ error: 'invalid_initial' }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const pOutcome = initial === 'pending' ? 'pending' : 'record_payment';
			let pAmount: number | null = null;
			let pMethod: string | null = null;
			let pPaymentDate: string | null = null;
			let pNotes: string | null = null;
			let pDonationPortion: number | null = null;
			let pReference: string | null = null;

			if (initial === 'active_with_payment') {
				const pay = ms.payment;
				if (pay == null || typeof pay !== 'object') {
					await service.from('members').delete().eq('id', memberId);
					return new Response(JSON.stringify({ error: 'payment_required' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				const p = pay as Record<string, unknown>;
				const amount = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount ?? ''));
				let method = typeof p.method === 'string' ? p.method.trim().toLowerCase() : '';
				if (method === 'other') method = 'unknown';
				if (Number.isNaN(amount) || amount <= 0) {
					await service.from('members').delete().eq('id', memberId);
					return new Response(JSON.stringify({ error: 'invalid_amount' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				if (!['e-transfer', 'cheque', 'cash', 'unknown'].includes(method)) {
					await service.from('members').delete().eq('id', memberId);
					return new Response(JSON.stringify({ error: 'invalid_method' }), {
						status: 400,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				pAmount = amount;
				pMethod = method;
				if (p.date !== undefined && p.date !== null && p.date !== '') {
					const d = typeof p.date === 'string' ? p.date : String(p.date);
					if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
						await service.from('members').delete().eq('id', memberId);
						return new Response(JSON.stringify({ error: 'invalid_date' }), {
							status: 400,
							headers: { 'Content-Type': 'application/json' },
						});
					}
					pPaymentDate = d;
				}
				pNotes = typeof p.notes === 'string' ? p.notes : null;
				if (p.donation_portion !== undefined && p.donation_portion !== null && p.donation_portion !== '') {
					const dp = typeof p.donation_portion === 'number' ? p.donation_portion : parseFloat(String(p.donation_portion));
					if (!Number.isNaN(dp)) pDonationPortion = dp;
				}
				if (p.reference !== undefined && p.reference !== null && typeof p.reference === 'string') {
					const r = p.reference.trim();
					pReference = r.length > 512 ? r.slice(0, 512) : r || null;
				}
			}

			const { data: rpcResult, error: rpcError } = await service.rpc('admin_create_membership', {
				p_member_id: memberId,
				p_year: year,
				p_tier: tier,
				p_outcome: pOutcome,
				p_amount: pAmount,
				p_method: pMethod,
				p_payment_date: pPaymentDate,
				p_notes: pNotes,
				p_donation_portion: pDonationPortion,
				p_reference: pReference,
			});

			if (rpcError) {
				await service.from('members').delete().eq('id', memberId);
				return new Response(JSON.stringify({ error: 'rpc_failed', detail: rpcError.message }), {
					status: 500,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			const result = rpcResult as {
				ok?: boolean;
				error?: string;
				membership_id?: string;
				payment_id?: number;
			} | null;
			if (!result?.ok) {
				await service.from('members').delete().eq('id', memberId);
				const code = result?.error ?? 'unknown';
				let status = 400;
				if (code === 'member_not_found' || code === 'not_found') status = 404;
				else if (code === 'already_exists') status = 409;
				return new Response(JSON.stringify({ error: code }), {
					status,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			createdWithMembership = true;
			if (initial === 'active_with_payment' && result.payment_id != null) {
				createdWithPayment = true;
				const amt = roundMoney(pAmount ?? 0);
				const auditDate = pPaymentDate ?? new Date().toISOString().slice(0, 10);
				recordPaymentAudit = {
					paymentId: result.payment_id,
					membershipId: result.membership_id ?? null,
					amount: amt,
					method: pMethod,
					auditDate,
				};
			}
		}
	}

	await insertAdminAudit(service, {
		actorUserId: auth.user.id,
		action: 'create_member',
		entityType: 'member',
		entityId: memberId,
		metadata: { created_with_membership: createdWithMembership, created_with_payment: createdWithPayment },
	});

	if (recordPaymentAudit) {
		await insertAdminAudit(service, {
			actorUserId: auth.user.id,
			action: 'record_payment',
			entityType: 'payment',
			entityId: String(recordPaymentAudit.paymentId),
			metadata: {
				member_id: memberId,
				membership_id: recordPaymentAudit.membershipId,
				amount: recordPaymentAudit.amount,
				method: recordPaymentAudit.method,
				date: recordPaymentAudit.auditDate,
			},
		});
	}

	return new Response(JSON.stringify({ member: { id: memberId } }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
