-- Read-only verification for the initial schema and seed data.
-- Run this in the Supabase SQL Editor after the migration and seed scripts.
-- It raises an error for any failed assertion and returns one success row otherwise.

do $$
declare
    table_name text;
    column_nullable text;
    disease_count integer;
begin
    foreach table_name in array array[
        'profiles',
        'disease_information',
        'model_versions',
        'predictions',
        'prediction_feedback'
    ] loop
        if to_regclass('public.' || table_name) is null then
            raise exception 'Missing table public.%', table_name;
        end if;
    end loop;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.predictions'::regclass
          and contype = 'f'
          and confrelid = 'auth.users'::regclass
          and pg_get_constraintdef(oid) like 'FOREIGN KEY (user_id)%'
    ) then
        raise exception 'predictions.user_id must reference auth.users(id)';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.predictions'::regclass
          and contype = 'f'
          and confrelid = 'public.disease_information'::regclass
          and pg_get_constraintdef(oid) like 'FOREIGN KEY (disease_information_id)%'
    ) then
        raise exception 'predictions.disease_information_id must be foreign-keyed';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.predictions'::regclass
          and contype = 'f'
          and confrelid = 'public.model_versions'::regclass
          and pg_get_constraintdef(oid) like 'FOREIGN KEY (model_version_id)%'
    ) then
        raise exception 'predictions.model_version_id must be foreign-keyed';
    end if;

    select is_nullable
    into column_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'predictions'
      and column_name = 'disease_information_id';
    if column_nullable <> 'YES' then
        raise exception 'predictions.disease_information_id must be nullable';
    end if;

    select is_nullable
    into column_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'predictions'
      and column_name = 'model_version_id';
    if column_nullable <> 'NO' then
        raise exception 'predictions.model_version_id must be non-null';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.prediction_feedback'::regclass
          and contype = 'u'
          and pg_get_constraintdef(oid) = 'UNIQUE (prediction_id, user_id)'
    ) then
        raise exception 'prediction_feedback must uniquely constrain (prediction_id, user_id)';
    end if;

    foreach table_name in array array['profiles', 'predictions', 'prediction_feedback'] loop
        if not exists (
            select 1
            from pg_class
            where oid = ('public.' || table_name)::regclass
              and relrowsecurity
        ) then
            raise exception 'RLS is not enabled on public.%', table_name;
        end if;
    end loop;

    if exists (
        select 1
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name in ('profiles', 'predictions', 'prediction_feedback')
          and grantee = 'anon'
    ) then
        raise exception 'anon must not receive grants on private application tables';
    end if;

    if not exists (
        select 1
        from storage.buckets
        where id = 'prediction-images'
          and public = false
          and file_size_limit = 5242880
    ) then
        raise exception 'prediction-images must be a private 5 MB bucket';
    end if;

    foreach table_name in array array[
        'prediction_images_select_own',
        'prediction_images_insert_own',
        'prediction_images_delete_own'
    ] loop
        if not exists (
            select 1
            from pg_policies
            where schemaname = 'storage'
              and tablename = 'objects'
              and policyname = table_name
        ) then
            raise exception 'Missing Storage ownership policy: %', table_name;
        end if;
    end loop;

    select count(*) into disease_count from public.disease_information;
    if disease_count <> 38 then
        raise exception 'Expected 38 disease mappings, found %', disease_count;
    end if;

    if not exists (
        select 1
        from public.model_versions
        where version = 'plant-village-effnetb3-original-v1'
    ) then
        raise exception 'Missing seed model version';
    end if;
end;
$$;

select
    'Supabase schema check passed' as status,
    (select count(*) from public.disease_information) as disease_mappings,
    (select count(*) from public.model_versions) as model_versions;
