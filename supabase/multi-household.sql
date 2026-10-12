-- DuoFin - suporte a múltiplas famílias
-- Mantém compatibilidade com os usuários existentes.

alter table public.households
  alter column name set default 'Minha família';

alter table public.app_users
  drop constraint if exists app_users_name_key_key;

alter table public.app_users
  add constraint app_users_household_name_key_key unique (household_id, name_key);

create unique index if not exists households_join_code_hash_unique
  on public.households(join_code_hash);

drop function if exists public.cm_register_user(text, text, text);

create function public.cm_register_user(
  p_name text,
  p_pin text,
  p_join_code text default null,
  p_household_name text default null
)
returns table (
  user_id uuid,
  user_name text,
  user_role text,
  household_id uuid,
  household_name text,
  session_token text,
  join_code text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_name text := trim(p_name);
  v_name_key text := lower(trim(p_name));
  v_household_id uuid;
  v_household_name text;
  v_join_code text;
  v_user_id uuid;
  v_role text;
  v_session_token text;
begin
  if v_name = '' then
    raise exception 'Digite seu nome.';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'O PIN deve ter exatamente 4 números.';
  end if;

  if nullif(trim(coalesce(p_join_code,'')), '') is not null then
    select h.id, h.name
      into v_household_id, v_household_name
    from public.households h
    where h.join_code_hash = encode(
      extensions.digest(upper(trim(p_join_code)), 'sha256'),
      'hex'
    )
    limit 1;

    if v_household_id is null then
      raise exception 'Código da família inválido.';
    end if;

    if exists (
      select 1
      from public.app_users u
      where u.household_id = v_household_id
        and u.name_key = v_name_key
    ) then
      raise exception 'Já existe uma pessoa com este nome nesta família.';
    end if;

    v_role := 'member';
    v_join_code := null;
  else
    v_household_name := coalesce(
      nullif(trim(p_household_name), ''),
      'Família de ' || v_name
    );

    loop
      v_join_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));
      exit when not exists (
        select 1
        from public.households h
        where h.join_code_hash = encode(
          extensions.digest(v_join_code, 'sha256'),
          'hex'
        )
      );
    end loop;

    insert into public.households (name, join_code_hash)
    values (
      v_household_name,
      encode(extensions.digest(v_join_code, 'sha256'), 'hex')
    )
    returning id into v_household_id;

    v_role := 'admin';

    insert into public.categories (household_id, name, type, icon, color) values
      (v_household_id, 'Moradia', 'expense', 'home', '#1368ff'),
      (v_household_id, 'Alimentação', 'expense', 'shopping-cart', '#14b87a'),
      (v_household_id, 'Supermercado', 'expense', 'shopping-basket', '#ff9f1c'),
      (v_household_id, 'Cuidado pessoal', 'expense', 'heart', '#7c3aed'),
      (v_household_id, 'Aquisição de bens', 'expense', 'package', '#0ea5e9'),
      (v_household_id, 'Empréstimo', 'expense', 'landmark', '#ef4444'),
      (v_household_id, 'Negociações', 'expense', 'handshake', '#8b5cf6'),
      (v_household_id, 'Roupa', 'expense', 'shirt', '#ec4899'),
      (v_household_id, 'Saúde', 'expense', 'activity', '#10b981'),
      (v_household_id, 'Transporte', 'expense', 'car', '#06b6d4'),
      (v_household_id, 'Lazer', 'expense', 'gamepad-2', '#f59e0b'),
      (v_household_id, 'Educação', 'expense', 'graduation-cap', '#6366f1'),
      (v_household_id, 'Assinaturas', 'expense', 'repeat', '#64748b'),
      (v_household_id, 'Outros', 'expense', 'circle-ellipsis', '#94a3b8'),
      (v_household_id, 'Renda principal', 'income', 'briefcase-business', '#10b981'),
      (v_household_id, 'Renda extra', 'income', 'badge-plus', '#0ea5e9'),
      (v_household_id, 'Reembolso', 'income', 'rotate-ccw', '#8b5cf6'),
      (v_household_id, 'Outras receitas', 'income', 'circle-plus', '#64748b')
    on conflict do nothing;
  end if;

  insert into public.app_users (
    household_id, name, name_key, pin_hash, role
  )
  values (
    v_household_id,
    v_name,
    v_name_key,
    extensions.crypt(p_pin, extensions.gen_salt('bf', 10)),
    v_role
  )
  returning id into v_user_id;

  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_sessions (user_id, token_hash, expires_at)
  values (
    v_user_id,
    encode(extensions.digest(v_session_token, 'sha256'), 'hex'),
    now() + interval '30 days'
  );

  return query
  select
    v_user_id,
    v_name,
    v_role,
    v_household_id,
    v_household_name,
    v_session_token,
    v_join_code;
end;
$$;

revoke all on function public.cm_register_user(text, text, text, text) from public;
grant execute on function public.cm_register_user(text, text, text, text) to anon, authenticated;

drop function if exists public.cm_login(text, text);

create function public.cm_login(
  p_name text,
  p_pin text,
  p_household_id uuid default null,
  p_join_code text default null
)
returns table (
  user_id uuid,
  user_name text,
  user_role text,
  household_id uuid,
  household_name text,
  session_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.app_users%rowtype;
  v_household_id uuid := p_household_id;
  v_household_name text;
  v_matches integer := 0;
  v_session_token text;
begin
  if trim(coalesce(p_name,'')) = '' then
    raise exception 'Digite seu nome.';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'O PIN deve ter exatamente 4 números.';
  end if;

  if nullif(trim(coalesce(p_join_code,'')), '') is not null then
    select h.id
      into v_household_id
    from public.households h
    where h.join_code_hash = encode(
      extensions.digest(upper(trim(p_join_code)), 'sha256'),
      'hex'
    )
    limit 1;

    if v_household_id is null then
      raise exception 'Código da família inválido.';
    end if;
  end if;

  if v_household_id is not null then
    select *
      into v_user
    from public.app_users u
    where u.household_id = v_household_id
      and u.name_key = lower(trim(p_name))
      and u.is_active = true
    limit 1;
  else
    select count(*)
      into v_matches
    from public.app_users u
    where u.name_key = lower(trim(p_name))
      and u.is_active = true;

    if v_matches > 1 then
      raise exception 'Há mais de uma pessoa com este nome. Informe o código da família.';
    end if;

    select *
      into v_user
    from public.app_users u
    where u.name_key = lower(trim(p_name))
      and u.is_active = true
    limit 1;
  end if;

  if v_user.id is null then
    raise exception 'Nome ou PIN incorretos.';
  end if;

  if v_user.locked_until is not null and v_user.locked_until > now() then
    raise exception 'Acesso temporariamente bloqueado. Tente novamente em alguns minutos.';
  end if;

  if extensions.crypt(p_pin, v_user.pin_hash) <> v_user.pin_hash then
    update public.app_users
    set
      failed_attempts = failed_attempts + 1,
      locked_until = case
        when failed_attempts + 1 >= 5 then now() + interval '15 minutes'
        else locked_until
      end,
      updated_at = now()
    where id = v_user.id;

    raise exception 'Nome ou PIN incorretos.';
  end if;

  update public.app_users
  set failed_attempts = 0, locked_until = null, updated_at = now()
  where id = v_user.id;

  delete from public.app_sessions s
  where s.user_id = v_user.id
    and s.expires_at <= now();

  select h.name
    into v_household_name
  from public.households h
  where h.id = v_user.household_id;

  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_sessions (user_id, token_hash, expires_at)
  values (
    v_user.id,
    encode(extensions.digest(v_session_token, 'sha256'), 'hex'),
    now() + interval '30 days'
  );

  return query
  select
    v_user.id,
    v_user.name,
    v_user.role,
    v_user.household_id,
    v_household_name,
    v_session_token;
end;
$$;

revoke all on function public.cm_login(text, text, uuid, text) from public;
grant execute on function public.cm_login(text, text, uuid, text) to anon, authenticated;

drop function if exists public.cm_validate_session();

create function public.cm_validate_session()
returns table (
  user_id uuid,
  user_name text,
  user_role text,
  household_id uuid,
  household_name text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id, u.name, u.role, u.household_id, h.name
  from public.app_users u
  join public.households h on h.id = u.household_id
  where u.id = public.cm_current_user_id()
    and u.is_active = true
  limit 1;
$$;

revoke all on function public.cm_validate_session() from public;
grant execute on function public.cm_validate_session() to anon, authenticated;

create or replace function public.cm_rotate_join_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.app_users%rowtype;
  v_code text;
begin
  select * into v_user
  from public.app_users
  where id = public.cm_current_user_id();

  if v_user.id is null or v_user.role <> 'admin' then
    raise exception 'Apenas o administrador pode gerar um novo código da família.';
  end if;

  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10));
    exit when not exists (
      select 1
      from public.households h
      where h.join_code_hash = encode(
        extensions.digest(v_code, 'sha256'),
        'hex'
      )
        and h.id <> v_user.household_id
    );
  end loop;

  update public.households
  set join_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
  where id = v_user.household_id;

  return v_code;
end;
$$;

grant execute on function public.cm_rotate_join_code() to anon, authenticated;
