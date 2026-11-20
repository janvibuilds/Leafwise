-- Plant Disease Detection: initial Supabase schema
--
-- Run this entire file in the Supabase Dashboard SQL Editor, then run
-- supabase/seed.sql and supabase/tests/schema-check.sql in that order.
-- This migration is intentionally safe to re-run on an otherwise untouched
-- project. It does not delete application data.

begin;

-- Keep trigger functions out of the exposed `public` schema. The SQL Editor
-- runs this migration as the project owner, which owns these functions.
create schema if not exists private;
revoke all on schema private from public;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    role text not null default 'user'
        check (role in ('user', 'admin', 'researcher')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.model_versions (
    id uuid primary key default gen_random_uuid(),
    version text not null unique,
    model_name text not null,
    dataset_name text not null,
    validation_accuracy double precision
        check (validation_accuracy is null or validation_accuracy between 0 and 1),
    test_accuracy double precision
        check (test_accuracy is null or test_accuracy between 0 and 1),
    macro_f1 double precision
        check (macro_f1 is null or macro_f1 between 0 and 1),
    model_card_path text not null,
    metrics jsonb not null default '{}'::jsonb,
    notes text,
    created_at timestamptz not null default now()
);

create table if not exists public.disease_information (
    id uuid primary key default gen_random_uuid(),
    class_index smallint not null unique check (class_index >= 0),
    model_label text not null unique,
    plant_name text not null,
    disease_name text not null,
    description text,
    symptoms text,
    prevention text,
    treatment_note text,
    source text,
    content_status text not null default 'pending_review'
        check (content_status in ('pending_review', 'reviewed')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (plant_name, disease_name)
);

create table if not exists public.predictions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    image_path text not null unique
        check (image_path <> '' and image_path !~ '^/' and image_path like user_id::text || '/%'),
    -- The API keeps these denormalized names for history responses. The trigger
    -- below derives and verifies the nullable disease link from them.
    plant_name text not null,
    disease_name text not null,
    disease_information_id uuid references public.disease_information(id)
        on delete set null,
    confidence double precision not null check (confidence between 0 and 1),
    confidence_state text not null
        check (confidence_state in ('high', 'review_recommended', 'uncertain')),
    top_predictions jsonb not null check (jsonb_typeof(top_predictions) = 'array'),
    model_version text not null,
    model_version_id uuid not null references public.model_versions(id)
        on delete restrict,
    inference_ms double precision not null check (inference_ms >= 0),
    created_at timestamptz not null default now()
);

create table if not exists public.prediction_feedback (
    id uuid primary key default gen_random_uuid(),
    prediction_id uuid not null references public.predictions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    is_correct boolean not null,
    comment text check (comment is null or char_length(comment) <= 2000),
    created_at timestamptz not null default now(),
    unique (prediction_id, user_id)
);

create index if not exists predictions_user_id_created_at_idx
    on public.predictions (user_id, created_at desc);
create index if not exists predictions_disease_information_id_idx
    on public.predictions (disease_information_id);
create index if not exists predictions_model_version_id_idx
    on public.predictions (model_version_id);
create index if not exists prediction_feedback_user_id_created_at_idx
    on public.prediction_feedback (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function private.set_row_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, full_name)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

-- The FastAPI request contract stores model_version, plant_name, and
-- disease_name. Resolve those authoritative values to foreign keys in one
-- place, keeping the current API compatible while preserving referential
-- integrity. Uncertain results deliberately do not link to treatment text.
create or replace function private.resolve_prediction_relationships()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    resolved_model_version_id uuid;
    resolved_disease_information_id uuid;
begin
    select id
    into resolved_model_version_id
    from public.model_versions
    where version = new.model_version;

    if resolved_model_version_id is null then
        raise exception 'Unknown model version: %', new.model_version
            using errcode = '23503';
    end if;

    if new.model_version_id is not null
       and new.model_version_id <> resolved_model_version_id then
        raise exception 'model_version_id does not match model_version'
            using errcode = '23503';
    end if;
    new.model_version_id = resolved_model_version_id;

    if new.confidence_state = 'uncertain' then
        new.disease_information_id = null;
        return new;
    end if;

    select id
    into resolved_disease_information_id
    from public.disease_information
    where plant_name = new.plant_name
      and disease_name = new.disease_name;

    if resolved_disease_information_id is null then
        raise exception 'No disease information row matches %, %',
            new.plant_name, new.disease_name
            using errcode = '23503';
    end if;

    if new.disease_information_id is not null
       and new.disease_information_id <> resolved_disease_information_id then
        raise exception 'disease_information_id does not match plant_name/disease_name'
            using errcode = '23503';
    end if;
    new.disease_information_id = resolved_disease_information_id;
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_row_updated_at();

drop trigger if exists disease_information_set_updated_at on public.disease_information;
create trigger disease_information_set_updated_at
before update on public.disease_information
for each row execute function private.set_row_updated_at();

drop trigger if exists predictions_resolve_relationships on public.predictions;
create trigger predictions_resolve_relationships
before insert or update on public.predictions
for each row execute function private.resolve_prediction_relationships();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

-- Backfill profiles for users created before this migration was run.
insert into public.profiles (id, full_name)
select
    users.id,
    coalesce(users.raw_user_meta_data ->> 'full_name', users.raw_user_meta_data ->> 'name')
from auth.users as users
on conflict (id) do nothing;

-- Private trigger functions are not callable through the Data API. These
-- explicit grants keep trigger execution working for Supabase Auth, normal
-- authenticated writes, and the backend's service-role client.
revoke all on all functions in schema private from public;
grant execute on function private.set_row_updated_at() to authenticated, service_role;
grant execute on function private.resolve_prediction_relationships() to authenticated, service_role;
grant execute on function private.create_profile_for_new_user() to supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- Table grants and Row Level Security
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.model_versions from anon, authenticated;
revoke all on table public.disease_information from anon, authenticated;
revoke all on table public.predictions from anon, authenticated;
revoke all on table public.prediction_feedback from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;
grant select on table public.model_versions to anon, authenticated;
grant select on table public.disease_information to anon, authenticated;
grant select, insert, delete on table public.predictions to authenticated;
grant select, insert, delete on table public.prediction_feedback to authenticated;
grant all on table public.profiles, public.model_versions,
    public.disease_information, public.predictions, public.prediction_feedback
    to service_role;

alter table public.profiles enable row level security;
alter table public.model_versions enable row level security;
alter table public.disease_information enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_feedback enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_update_own_name on public.profiles;
create policy profiles_update_own_name
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists model_versions_public_read on public.model_versions;
create policy model_versions_public_read
on public.model_versions for select to anon, authenticated
using (true);

drop policy if exists disease_information_public_read on public.disease_information;
create policy disease_information_public_read
on public.disease_information for select to anon, authenticated
using (true);

drop policy if exists predictions_select_own on public.predictions;
create policy predictions_select_own
on public.predictions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists predictions_insert_own on public.predictions;
create policy predictions_insert_own
on public.predictions for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists predictions_delete_own on public.predictions;
create policy predictions_delete_own
on public.predictions for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists prediction_feedback_select_own on public.prediction_feedback;
create policy prediction_feedback_select_own
on public.prediction_feedback for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists prediction_feedback_insert_own on public.prediction_feedback;
create policy prediction_feedback_insert_own
on public.prediction_feedback for insert to authenticated
with check (
    (select auth.uid()) = user_id
    and exists (
        select 1
        from public.predictions as prediction
        where prediction.id = prediction_feedback.prediction_id
          and prediction.user_id = (select auth.uid())
    )
);

drop policy if exists prediction_feedback_delete_own on public.prediction_feedback;
create policy prediction_feedback_delete_own
on public.prediction_feedback for delete to authenticated
using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Private image bucket and Storage policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'prediction-images',
    'prediction-images',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- These direct-client policies mirror the API's `{user_id}/{prediction_id}`
-- object layout. The backend uses a server-only secret key and still enforces
-- ownership in its own queries before issuing a signed URL.
drop policy if exists prediction_images_select_own on storage.objects;
create policy prediction_images_select_own
on storage.objects for select to authenticated
using (
    bucket_id = 'prediction-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists prediction_images_insert_own on storage.objects;
create policy prediction_images_insert_own
on storage.objects for insert to authenticated
with check (
    bucket_id = 'prediction-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists prediction_images_delete_own on storage.objects;
create policy prediction_images_delete_own
on storage.objects for delete to authenticated
using (
    bucket_id = 'prediction-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
);

commit;
