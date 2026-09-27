-- Permite que Carol e Marcos editem as mesmas metas da família.
-- Execute uma única vez no SQL Editor do Supabase.

drop policy if exists goals_all on public.goals;

create policy goals_all
on public.goals
for all
to anon, authenticated
using (household_id = public.cm_current_household_id())
with check (household_id = public.cm_current_household_id());

grant select, insert, update, delete on public.goals to anon, authenticated;
