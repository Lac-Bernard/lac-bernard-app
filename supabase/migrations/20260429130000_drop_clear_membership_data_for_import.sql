-- Drops RPC from a prior attempt; CSV import --reset uses PostgREST deletes again.
drop function if exists public.clear_membership_data_for_import();
