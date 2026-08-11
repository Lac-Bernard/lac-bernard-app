-- Platform default installs pg_net; this project deliberately doesn't use it.
drop extension if exists "pg_net";

create table if not exists "public"."admin_audit_log" (
    "id" bigint generated always as identity not null,
    "created_at" timestamp with time zone default now() not null,
    "actor_user_id" uuid not null,
    "action" text not null,
    "entity_type" text,
    "entity_id" text,
    "metadata" jsonb,
    constraint "admin_audit_log_pkey" primary key ("id")
);

comment on table "public"."admin_audit_log" is 'Admin actions (inserted server-side with service role only).';

create table if not exists "public"."members" (
    "id" uuid default gen_random_uuid() not null,
    "created_at" timestamp with time zone default now() not null,
    "first_name" text,
    "last_name" text not null,
    "primary_email" text,
    "secondary_email" text,
    "primary_phone" text,
    "secondary_phone" text,
    "lake_civic_number" text,
    "lake_street_name" text,
    "email_opt_in" boolean default false not null,
    "notes" text,
    "status" text default 'new'::text not null,
    "user_id" uuid,
    "stripe_customer_id" text,
    "lake_address_source" text,
    "lake_google_place_id" text,
    "lake_formatted_address" text,
    "secondary_first_name" text,
    "secondary_last_name" text,
    constraint "Members_pkey" primary key ("id"),
    constraint "members_lake_address_source_check" check (("lake_address_source" is null or ("lake_address_source" = any (array['places'::text, 'manual'::text])))),
    constraint "members_status_check" check (("status" = any (array['new'::text, 'enrolled'::text, 'disabled'::text])))
);

comment on column "public"."members"."status" is 'Member record lifecycle: new (no activation yet), enrolled (directory/comms; at least one membership activated or backfilled), disabled (excluded from default directory and exports).';
comment on column "public"."members"."user_id" is 'Supabase Auth user id for this member row; null if not linked.';
comment on column "public"."members"."stripe_customer_id" is 'Stripe Customer id (cus_…) for hosted Checkout, future invoices, and portal.';
comment on column "public"."members"."lake_address_source" is 'How lake civic/street were set: places (Google Places) or manual.';
comment on column "public"."members"."lake_google_place_id" is 'Google Place ID when lake_address_source = places; not used for voting key.';
comment on column "public"."members"."lake_formatted_address" is 'Display line from Places formattedAddress or concatenated manual civic + street.';
comment on column "public"."members"."secondary_first_name" is 'Second given name when the source sheet lists two people in First Name (e.g. after & or and).';
comment on column "public"."members"."secondary_last_name" is 'Maps from legacy Other LName; second surname for the co-listed person.';

create unique index "members_stripe_customer_id_key" on "public"."members" using btree ("stripe_customer_id") where ("stripe_customer_id" is not null);
create unique index "members_user_id_key" on "public"."members" using btree ("user_id") where ("user_id" is not null);

alter table "public"."members" enable row level security;

create policy "members_insert_own" on "public"."members" for insert to "authenticated"
  with check ((("user_id" = auth.uid()) and ("primary_email" is not null) and (lower(trim(both from "primary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text))))));

create policy "members_select_own_by_email" on "public"."members" for select to "authenticated"
  using ((("user_id" = auth.uid()) or (("primary_email" is not null) and (lower(trim(both from "primary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text)))))));

create policy "members_update_own" on "public"."members" for update to "authenticated"
  using (("user_id" = auth.uid()))
  with check ((("user_id" = auth.uid()) and (lower(trim(both from "primary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text))))));

create table if not exists "public"."memberships" (
    "id" uuid default gen_random_uuid() not null,
    "created_at" timestamp with time zone default now() not null,
    "member_id" uuid default gen_random_uuid() not null,
    "year" smallint not null,
    "tier" text not null,
    "status" text default 'active'::text not null,
    "activated_at" timestamp with time zone,
    "complimentary" boolean default false not null,
    constraint "Memberships_pkey" primary key ("id"),
    constraint "memberships_status_check" check (("status" = any (array['pending'::text, 'active'::text]))),
    constraint "tier" check (("tier" = any (array['voting'::text, 'associate'::text])))
);

comment on column "public"."memberships"."activated_at" is 'First transition to active (or legacy/import synthetic time). Cleared when status leaves active.';
comment on column "public"."memberships"."complimentary" is 'True when the membership was granted free by an admin (no payment collected). Status sync ignores these rows.';
comment on constraint "tier" on "public"."memberships" is 'Membership type: voting (one per lake property per year) or associate.';

create unique index "memberships_member_id_year_key" on "public"."memberships" using btree ("member_id", "year");

alter table "public"."memberships" enable row level security;

create policy "memberships_delete_own_pending" on "public"."memberships" for delete to "authenticated"
  using ((("status" = 'pending'::text) and (exists ( select 1
     from "public"."members" "m"
    where (("m"."id" = "memberships"."member_id") and (("m"."user_id" = auth.uid()) or (("m"."primary_email" is not null) and (lower(trim(both from "m"."primary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text)))))))))));

create policy "memberships_insert_own_pending" on "public"."memberships" for insert to "authenticated"
  with check ((("status" = 'pending'::text) and ("complimentary" = false) and ("year" = (extract(year from (now() at time zone 'America/Toronto'::text)))::smallint) and (exists ( select 1
     from "public"."members" "m"
    where (("m"."id" = "memberships"."member_id") and (("m"."user_id" = auth.uid()) or (("m"."primary_email" is not null) and (lower(trim(both from "m"."primary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text)))))))))));

create policy "memberships_select_for_own_member" on "public"."memberships" for select to "authenticated"
  using ((exists ( select 1
     from "public"."members" "m"
    where (("m"."id" = "memberships"."member_id") and (("m"."user_id" = auth.uid()) or (("m"."primary_email" is not null) and (lower(trim(both from "m"."primary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text))))))))));

create table if not exists "public"."payments" (
    "id" bigint generated by default as identity not null,
    "created_at" timestamp with time zone default now() not null,
    "membership_id" uuid not null,
    "method" text,
    "amount" numeric,
    "date" date,
    "notes" text,
    "payment_id" text,
    "membership_amount" numeric default 0 not null,
    "donation_amount" numeric default 0 not null,
    "donation_note" text,
    "stripe_fee_cad" numeric(12,2),
    "stripe_balance_transaction_id" text,
    "donation_category" text,
    constraint "payments_pkey" primary key ("id"),
    constraint "payments_membership_donation_split_check" check ((("membership_amount" >= (0)::numeric) and ("donation_amount" >= (0)::numeric) and (round(("membership_amount" + "donation_amount"), 2) = round("amount", 2)))),
    constraint "payments_method_check" check (("method" = any (array['stripe'::text, 'e-transfer'::text, 'cheque'::text, 'cash'::text, 'unknown'::text]))),
    constraint "payments_donation_category_check" check ((("donation_category" is null) or ("donation_category" = any (array['environment'::text, 'regatta'::text, 'general'::text]))))
);

comment on column "public"."payments"."membership_amount" is 'Portion applied to membership dues for this membership year.';
comment on column "public"."payments"."donation_amount" is 'Optional donation portion (same payment row as dues).';
comment on column "public"."payments"."donation_note" is 'Optional note for the donation (e.g. Stripe checkout).';
comment on column "public"."payments"."donation_category" is 'Optional earmark for the donation portion (environment/regatta/general). Null for payments recorded before this field existed or where no category was chosen.';
comment on column "public"."payments"."stripe_fee_cad" is 'Total Stripe processing fee for this charge in CAD (dollars). Net to platform ≈ amount - stripe_fee_cad when set.';
comment on column "public"."payments"."stripe_balance_transaction_id" is 'Stripe Balance Transaction id (txn_…) for the charge; optional audit trail.';

create unique index "payments_stripe_payment_id_unique" on "public"."payments" using btree ("payment_id") where (("method" = 'stripe'::text) and ("payment_id" is not null));

alter table "public"."payments" enable row level security;

create policy "payments_select_for_own_membership" on "public"."payments" for select to "authenticated"
  using ((exists ( select 1
     from ("public"."memberships" "ms"
       join "public"."members" "m" on (("m"."id" = "ms"."member_id")))
    where (("ms"."id" = "payments"."membership_id") and ((("m"."primary_email" is not null) and (lower(trim(both from "m"."primary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text))))) or (("m"."secondary_email" is not null) and (lower(trim(both from "m"."secondary_email")) = lower(trim(both from coalesce((auth.jwt() ->> 'email'::text), ''::text))))))))));

comment on policy "payments_select_for_own_membership" on "public"."payments" is 'Member portal: read-only access to payment rows linked to memberships owned by the signed-in user.';

alter table only "public"."memberships"
    add constraint "Memberships_member_id_fkey" foreign key ("member_id") references "public"."members"("id") on delete restrict;

alter table only "public"."members"
    add constraint "members_user_id_fkey" foreign key ("user_id") references "auth"."users"("id") on delete set null;

alter table only "public"."payments"
    add constraint "payments_membership_id_fkey" foreign key ("membership_id") references "public"."memberships"("id") on delete restrict;

alter table "public"."admin_audit_log" enable row level security;

-- Base table privileges (RLS policies above enforce row-level access).
grant delete on table "public"."admin_audit_log" to "anon";
grant insert on table "public"."admin_audit_log" to "anon";
grant references on table "public"."admin_audit_log" to "anon";
grant select on table "public"."admin_audit_log" to "anon";
grant trigger on table "public"."admin_audit_log" to "anon";
grant truncate on table "public"."admin_audit_log" to "anon";
grant update on table "public"."admin_audit_log" to "anon";
grant delete on table "public"."admin_audit_log" to "authenticated";
grant insert on table "public"."admin_audit_log" to "authenticated";
grant references on table "public"."admin_audit_log" to "authenticated";
grant select on table "public"."admin_audit_log" to "authenticated";
grant trigger on table "public"."admin_audit_log" to "authenticated";
grant truncate on table "public"."admin_audit_log" to "authenticated";
grant update on table "public"."admin_audit_log" to "authenticated";
grant delete on table "public"."admin_audit_log" to "service_role";
grant insert on table "public"."admin_audit_log" to "service_role";
grant references on table "public"."admin_audit_log" to "service_role";
grant select on table "public"."admin_audit_log" to "service_role";
grant trigger on table "public"."admin_audit_log" to "service_role";
grant truncate on table "public"."admin_audit_log" to "service_role";
grant update on table "public"."admin_audit_log" to "service_role";
grant delete on table "public"."members" to "anon";
grant insert on table "public"."members" to "anon";
grant references on table "public"."members" to "anon";
grant select on table "public"."members" to "anon";
grant trigger on table "public"."members" to "anon";
grant truncate on table "public"."members" to "anon";
grant update on table "public"."members" to "anon";
grant delete on table "public"."members" to "authenticated";
grant insert on table "public"."members" to "authenticated";
grant references on table "public"."members" to "authenticated";
grant select on table "public"."members" to "authenticated";
grant trigger on table "public"."members" to "authenticated";
grant truncate on table "public"."members" to "authenticated";
grant update on table "public"."members" to "authenticated";
grant delete on table "public"."members" to "service_role";
grant insert on table "public"."members" to "service_role";
grant references on table "public"."members" to "service_role";
grant select on table "public"."members" to "service_role";
grant trigger on table "public"."members" to "service_role";
grant truncate on table "public"."members" to "service_role";
grant update on table "public"."members" to "service_role";
grant delete on table "public"."memberships" to "anon";
grant insert on table "public"."memberships" to "anon";
grant references on table "public"."memberships" to "anon";
grant select on table "public"."memberships" to "anon";
grant trigger on table "public"."memberships" to "anon";
grant truncate on table "public"."memberships" to "anon";
grant update on table "public"."memberships" to "anon";
grant delete on table "public"."memberships" to "authenticated";
grant insert on table "public"."memberships" to "authenticated";
grant references on table "public"."memberships" to "authenticated";
grant select on table "public"."memberships" to "authenticated";
grant trigger on table "public"."memberships" to "authenticated";
grant truncate on table "public"."memberships" to "authenticated";
grant update on table "public"."memberships" to "authenticated";
grant delete on table "public"."memberships" to "service_role";
grant insert on table "public"."memberships" to "service_role";
grant references on table "public"."memberships" to "service_role";
grant select on table "public"."memberships" to "service_role";
grant trigger on table "public"."memberships" to "service_role";
grant truncate on table "public"."memberships" to "service_role";
grant update on table "public"."memberships" to "service_role";
grant delete on table "public"."payments" to "anon";
grant insert on table "public"."payments" to "anon";
grant references on table "public"."payments" to "anon";
grant select on table "public"."payments" to "anon";
grant trigger on table "public"."payments" to "anon";
grant truncate on table "public"."payments" to "anon";
grant update on table "public"."payments" to "anon";
grant delete on table "public"."payments" to "authenticated";
grant insert on table "public"."payments" to "authenticated";
grant references on table "public"."payments" to "authenticated";
grant select on table "public"."payments" to "authenticated";
grant trigger on table "public"."payments" to "authenticated";
grant truncate on table "public"."payments" to "authenticated";
grant update on table "public"."payments" to "authenticated";
grant delete on table "public"."payments" to "service_role";
grant insert on table "public"."payments" to "service_role";
grant references on table "public"."payments" to "service_role";
grant select on table "public"."payments" to "service_role";
grant trigger on table "public"."payments" to "service_role";
grant truncate on table "public"."payments" to "service_role";
grant update on table "public"."payments" to "service_role";
