-- Configurações finais: gerenciamento de usuários da família.
-- Execute uma única vez no SQL Editor do Supabase.

create or replace function public.cm_set_user_active(
  p_user_id uuid,
  p_is_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.app_users%rowtype;
  v_target public.app_users%rowtype;
begin
  select *
    into v_admin
  from public.app_users
  where id = public.cm_current_user_id();

  if v_admin.id is null or v_admin.role <> 'admin' then
    raise exception 'Apenas o administrador pode alterar usuários.';
  end if;

  if v_admin.id = p_user_id and p_is_active = false then
    raise exception 'Você não pode desativar seu próprio usuário.';
  end if;

  select *
    into v_target
  from public.app_users
  where id = p_user_id
    and household_id = v_admin.household_id;

  if v_target.id is null then
    raise exception 'Usuário não encontrado nesta família.';
  end if;

  update public.app_users
  set is_active = p_is_active,
      updated_at = now()
  where id = p_user_id;

  if p_is_active = false then
    delete from public.app_sessions
    where user_id = p_user_id;
  end if;

  return true;
end;
$$;

grant execute on function public.cm_set_user_active(uuid, boolean) to anon, authenticated;
