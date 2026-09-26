-- Correção pontual do login: referência ambígua a user_id
-- Execute no SQL Editor do Supabase.

create or replace function public.cm_login(
  p_name text,
  p_pin text
)
returns table (
  user_id uuid,
  user_name text,
  user_role text,
  household_id uuid,
  session_token text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.app_users%rowtype;
  v_session_token text;
begin
  select *
    into v_user
  from public.app_users
  where name_key = lower(trim(p_name))
    and is_active = true
  limit 1;

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

  v_session_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_sessions (user_id, token_hash, expires_at)
  values (
    v_user.id,
    encode(extensions.digest(v_session_token, 'sha256'), 'hex'),
    now() + interval '30 days'
  );

  return query
  select v_user.id, v_user.name, v_user.role, v_user.household_id, v_session_token;
end;
$$;

grant execute on function public.cm_login(text, text) to anon, authenticated;
