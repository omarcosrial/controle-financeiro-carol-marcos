-- Adiciona o titular do cartão (Marcos ou Carol).
-- Execute uma única vez no SQL Editor do Supabase.

alter table public.credit_cards
add column if not exists holder_user_id uuid
references public.app_users(id)
on delete set null;
