-- Carol & Marcos - Controle Financeiro
-- Schema inicial para Supabase
-- Execute este arquivo no SQL Editor do Supabase uma única vez.

create extension if not exists pgcrypto with schema extensions;

-- =========================================================
-- NÚCLEO: FAMÍLIA, USUÁRIOS E SESSÕES
-- =========================================================

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Carol & Marcos',
  join_code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  name_key text not null unique,
  pin_hash text not null,
  role text not null default 'member' check (role in ('admin','member')),
  is_active boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;

revoke all on public.households from anon, authenticated;
revoke all on public.app_users from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;

-- =========================================================
-- HELPERS DE SESSÃO
-- =========================================================

create or replace function public.cm_request_header(header_name text)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.headers', true), '')::jsonb ->> lower(header_name),
    ''
  );
$$;

create or replace function public.cm_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select s.user_id
  from public.app_sessions s
  join public.app_users u on u.id = s.user_id
  where s.token_hash = encode(
    extensions.digest(public.cm_request_header('x-cm-session'), 'sha256'),
    'hex'
  )
    and s.expires_at > now()
    and u.is_active = true
  limit 1;
$$;

create or replace function public.cm_current_household_id()
returns uuid
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.household_id
  from public.app_users u
  where u.id = public.cm_current_user_id()
  limit 1;
$$;

revoke all on function public.cm_current_user_id() from public;
revoke all on function public.cm_current_household_id() from public;
grant execute on function public.cm_current_user_id() to anon, authenticated;
grant execute on function public.cm_current_household_id() to anon, authenticated;

-- =========================================================
-- CATEGORIAS
-- =========================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  type text not null default 'expense' check (type in ('income','expense','both')),
  icon text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, name, type)
);

alter table public.categories enable row level security;

drop policy if exists categories_select on public.categories;
create policy categories_select
on public.categories for select
to anon, authenticated
using (household_id = public.cm_current_household_id());

drop policy if exists categories_insert on public.categories;
create policy categories_insert
on public.categories for insert
to anon, authenticated
with check (household_id = public.cm_current_household_id());

drop policy if exists categories_update on public.categories;
create policy categories_update
on public.categories for update
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (household_id = public.cm_current_household_id());

drop policy if exists categories_delete on public.categories;
create policy categories_delete
on public.categories for delete
to anon, authenticated
using (household_id = public.cm_current_household_id());

grant select, insert, update, delete on public.categories to anon, authenticated;

-- =========================================================
-- CADASTRO / LOGIN POR NOME + PIN
-- =========================================================

create or replace function public.cm_register_user(
  p_name text,
  p_pin text,
  p_join_code text default null
)
returns table (
  user_id uuid,
  user_name text,
  user_role text,
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
  v_join_hash text;
  v_join_code text;
  v_user_id uuid;
  v_role text;
  v_session_token text;
begin
  if v_name = '' then
    raise exception 'Digite um nome.';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'O PIN deve ter exatamente 4 números.';
  end if;

  if exists (select 1 from public.app_users where name_key = v_name_key) then
    raise exception 'Este nome já está cadastrado.';
  end if;

  select h.id, h.join_code_hash
    into v_household_id, v_join_hash
  from public.households h
  order by h.created_at
  limit 1;

  if v_household_id is null then
    v_join_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));

    insert into public.households (name, join_code_hash)
    values (
      'Carol & Marcos',
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
  else
    if p_join_code is null
       or encode(extensions.digest(upper(trim(p_join_code)), 'sha256'), 'hex') <> v_join_hash then
      raise exception 'Código da família inválido.';
    end if;
    v_role := 'member';
    v_join_code := null;
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
  select v_user_id, v_name, v_role, v_session_token, v_join_code;
end;
$$;

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

create or replace function public.cm_validate_session()
returns table (
  user_id uuid,
  user_name text,
  user_role text,
  household_id uuid
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id, u.name, u.role, u.household_id
  from public.app_users u
  where u.id = public.cm_current_user_id()
    and u.is_active = true
  limit 1;
$$;

create or replace function public.cm_logout()
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_deleted integer;
begin
  delete from public.app_sessions
  where token_hash = encode(
    extensions.digest(public.cm_request_header('x-cm-session'), 'sha256'),
    'hex'
  );

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

create or replace function public.cm_change_pin(
  p_current_pin text,
  p_new_pin text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user public.app_users%rowtype;
begin
  if p_new_pin !~ '^[0-9]{4}$' then
    raise exception 'O novo PIN deve ter exatamente 4 números.';
  end if;

  select * into v_user
  from public.app_users
  where id = public.cm_current_user_id();

  if v_user.id is null then
    raise exception 'Sessão inválida.';
  end if;

  if extensions.crypt(p_current_pin, v_user.pin_hash) <> v_user.pin_hash then
    raise exception 'PIN atual incorreto.';
  end if;

  update public.app_users
  set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 10)),
      updated_at = now()
  where id = v_user.id;

  return true;
end;
$$;

create or replace function public.cm_list_users()
returns table (
  id uuid,
  name text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id, u.name, u.role, u.is_active, u.created_at
  from public.app_users u
  where u.household_id = public.cm_current_household_id()
  order by u.created_at;
$$;

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

  v_code := upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8));

  update public.households
  set join_code_hash = encode(extensions.digest(v_code, 'sha256'), 'hex')
  where id = v_user.household_id;

  return v_code;
end;
$$;

grant execute on function public.cm_register_user(text, text, text) to anon, authenticated;
grant execute on function public.cm_login(text, text) to anon, authenticated;
grant execute on function public.cm_validate_session() to anon, authenticated;
grant execute on function public.cm_logout() to anon, authenticated;
grant execute on function public.cm_change_pin(text, text) to anon, authenticated;
grant execute on function public.cm_list_users() to anon, authenticated;
grant execute on function public.cm_rotate_join_code() to anon, authenticated;

create or replace function public.cm_set_user_active(
  p_user_id uuid,
  p_is_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $cm$
declare
  v_admin public.app_users%rowtype;
  v_target public.app_users%rowtype;
begin
  select * into v_admin
  from public.app_users
  where id = public.cm_current_user_id();

  if v_admin.id is null or v_admin.role <> 'admin' then
    raise exception 'Apenas o administrador pode alterar usuários.';
  end if;

  if v_admin.id = p_user_id and p_is_active = false then
    raise exception 'Você não pode desativar seu próprio usuário.';
  end if;

  select * into v_target
  from public.app_users
  where id = p_user_id
    and household_id = v_admin.household_id;

  if v_target.id is null then
    raise exception 'Usuário não encontrado nesta família.';
  end if;

  update public.app_users
  set is_active = p_is_active, updated_at = now()
  where id = p_user_id;

  if p_is_active = false then
    delete from public.app_sessions where user_id = p_user_id;
  end if;

  return true;
end;
$cm$;

grant execute on function public.cm_set_user_active(uuid, boolean) to anon, authenticated;

-- =========================================================
-- CARTÕES
-- =========================================================

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  brand text,
  last4 text,
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  color text,
  is_active boolean not null default true,
  holder_user_id uuid references public.app_users(id) on delete set null,
  created_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.credit_cards enable row level security;

drop policy if exists credit_cards_all on public.credit_cards;
create policy credit_cards_all
on public.credit_cards
for all
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (household_id = public.cm_current_household_id());

grant select, insert, update, delete on public.credit_cards to anon, authenticated;

-- =========================================================
-- LANÇAMENTOS
-- =========================================================

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  type text not null check (type in ('income','expense','investment','transfer')),
  description text not null,
  amount numeric(14,2) not null check (amount >= 0),
  category_id uuid references public.categories(id) on delete set null,
  card_id uuid references public.credit_cards(id) on delete set null,
  kind text not null default 'variable' check (
    kind in ('recurring','extra','fixed','variable','installment','card','other')
  ),
  status text not null default 'pending' check (
    status in ('planned','pending','paid','received','overdue','cancelled')
  ),
  transaction_date date not null default current_date,
  due_date date,
  paid_date date,
  payment_method text,
  installment_group uuid,
  installment_number integer,
  total_installments integer,
  is_recurring boolean not null default false,
  recurrence_day smallint check (recurrence_day between 1 and 31),
  merchant text,
  notes text,
  source text not null default 'manual' check (
    source in ('manual','receipt','recurring','card','import')
  ),
  created_by uuid not null default public.cm_current_user_id() references public.app_users(id),
  paid_by uuid references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_household_date_idx
  on public.transactions (household_id, transaction_date desc);

create index if not exists transactions_household_due_idx
  on public.transactions (household_id, due_date);

create index if not exists transactions_household_category_idx
  on public.transactions (household_id, category_id);

alter table public.transactions enable row level security;

drop policy if exists transactions_select on public.transactions;
create policy transactions_select
on public.transactions for select
to anon, authenticated
using (household_id = public.cm_current_household_id());

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert
on public.transactions for insert
to anon, authenticated
with check (
  household_id = public.cm_current_household_id()
  and created_by = public.cm_current_user_id()
);

drop policy if exists transactions_update on public.transactions;
create policy transactions_update
on public.transactions for update
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (household_id = public.cm_current_household_id());

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete
on public.transactions for delete
to anon, authenticated
using (household_id = public.cm_current_household_id());

grant select, insert, update, delete on public.transactions to anon, authenticated;

-- =========================================================
-- ORÇAMENTOS E METAS
-- =========================================================

create table if not exists public.monthly_budgets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month smallint not null check (month between 1 and 12),
  category_id uuid references public.categories(id) on delete cascade,
  planned_amount numeric(14,2) not null default 0 check (planned_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists monthly_budgets_unique_idx
on public.monthly_budgets (
  household_id,
  year,
  month,
  coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

alter table public.monthly_budgets enable row level security;

drop policy if exists monthly_budgets_all on public.monthly_budgets;
create policy monthly_budgets_all
on public.monthly_budgets
for all
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (household_id = public.cm_current_household_id());

grant select, insert, update, delete on public.monthly_budgets to anon, authenticated;

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  target_amount numeric(14,2) not null default 0 check (target_amount >= 0),
  current_amount numeric(14,2) not null default 0 check (current_amount >= 0),
  due_date date,
  status text not null default 'active' check (status in ('active','completed','paused')),
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  created_by uuid not null default public.cm_current_user_id() references public.app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists goals_all on public.goals;
create policy goals_all
on public.goals
for all
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (household_id = public.cm_current_household_id());

grant select, insert, update, delete on public.goals to anon, authenticated;

-- =========================================================
-- CUPONS FISCAIS / ITENS
-- =========================================================

create table if not exists public.receipt_imports (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  store_name text,
  receipt_date date,
  total_amount numeric(14,2),
  qr_content text,
  image_path text,
  status text not null default 'review' check (status in ('review','confirmed','error')),
  created_by uuid not null default public.cm_current_user_id() references public.app_users(id),
  created_at timestamptz not null default now()
);

alter table public.receipt_imports enable row level security;

drop policy if exists receipt_imports_all on public.receipt_imports;
create policy receipt_imports_all
on public.receipt_imports
for all
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (
  household_id = public.cm_current_household_id()
  and created_by = public.cm_current_user_id()
);

grant select, insert, update, delete on public.receipt_imports to anon, authenticated;

create table if not exists public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  receipt_id uuid not null references public.receipt_imports(id) on delete cascade,
  description text not null,
  quantity numeric(12,3) not null default 1,
  unit text,
  unit_price numeric(14,2),
  total_price numeric(14,2) not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.receipt_items enable row level security;

drop policy if exists receipt_items_all on public.receipt_items;
create policy receipt_items_all
on public.receipt_items
for all
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (household_id = public.cm_current_household_id());

grant select, insert, update, delete on public.receipt_items to anon, authenticated;

-- =========================================================
-- TRIGGER DE UPDATED_AT
-- =========================================================

create or replace function public.cm_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_users_touch_updated_at on public.app_users;
create trigger app_users_touch_updated_at
before update on public.app_users
for each row execute function public.cm_touch_updated_at();

drop trigger if exists credit_cards_touch_updated_at on public.credit_cards;
create trigger credit_cards_touch_updated_at
before update on public.credit_cards
for each row execute function public.cm_touch_updated_at();

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
before update on public.transactions
for each row execute function public.cm_touch_updated_at();

drop trigger if exists monthly_budgets_touch_updated_at on public.monthly_budgets;
create trigger monthly_budgets_touch_updated_at
before update on public.monthly_budgets
for each row execute function public.cm_touch_updated_at();

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
before update on public.goals
for each row execute function public.cm_touch_updated_at();

-- =========================================================
-- FIM
-- =========================================================
