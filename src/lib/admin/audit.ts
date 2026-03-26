import type { SupabaseClient } from '@supabase/supabase-js';

export async function insertAdminAudit(
	supabase: SupabaseClient,
	params: {
		actorUserId: string;
		action: string;
		entityType?: string;
		entityId?: string;
		metadata?: Record<string, unknown>;
	},
): Promise<void> {
	await supabase.from('admin_audit_log').insert({
		actor_user_id: params.actorUserId,
		action: params.action,
		entity_type: params.entityType ?? null,
		entity_id: params.entityId ?? null,
		metadata: params.metadata ?? null,
	});
}
