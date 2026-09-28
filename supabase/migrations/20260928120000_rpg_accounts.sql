-- The Menace of Eterna: account e salvataggi online.
-- Migrazione applicata da Supabase a ogni push su master (integrazione GitHub): è ripetibile,
-- non tocca i dati già salvati.
-- La tabella non è leggibile dal browser: si passa solo da queste funzioni, che controllano il PIN.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.rpg_accounts (
  name         text primary key,              -- nome in minuscolo
  display      text not null,
  pin          text not null,                 -- bcrypt
  saves        jsonb not null default '[null,null,null]',
  fails        int not null default 0,
  locked_until timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.rpg_accounts enable row level security;   -- nessuna policy: niente accesso diretto
revoke all on public.rpg_accounts from anon, authenticated;

create or replace function public.rpg_register(p_name text, p_pin text, p_saves jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  p_name := trim(p_name);
  if length(p_name) < 2 or length(p_name) > 12 or length(p_pin) < 4 or length(p_pin) > 16 then
    return jsonb_build_object('ok', false, 'msg', 'Nome o PIN non validi.');
  end if;
  if p_saves is not null and (jsonb_typeof(p_saves) <> 'array' or jsonb_array_length(p_saves) <> 3
                              or octet_length(p_saves::text) > 1500000) then
    p_saves := null;
  end if;
  insert into rpg_accounts (name, display, pin, saves)
  values (lower(p_name), p_name, crypt(p_pin, gen_salt('bf')), coalesce(p_saves, '[null,null,null]'))
  on conflict (name) do nothing;
  if not found then return jsonb_build_object('ok', false, 'msg', 'Questo nome esiste già.'); end if;
  return jsonb_build_object('ok', true, 'name', p_name);
end $$;

-- controllo del PIN con blocco di 5 minuti dopo 8 tentativi sbagliati
create or replace function public.rpg_auth(p_name text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare a rpg_accounts;
begin
  select * into a from rpg_accounts where name = lower(trim(p_name)) for update;
  if not found then return jsonb_build_object('ok', false, 'missing', true, 'msg', 'Account inesistente.'); end if;
  if a.locked_until > now() then
    return jsonb_build_object('ok', false, 'msg', 'Troppi tentativi: riprova tra qualche minuto.');
  end if;
  if a.pin <> crypt(p_pin, a.pin) then
    update rpg_accounts set
      locked_until = case when fails + 1 >= 8 then now() + interval '5 minutes' end,
      fails = case when fails + 1 >= 8 then 0 else fails + 1 end
    where name = a.name;
    return jsonb_build_object('ok', false, 'msg', 'PIN errato.');
  end if;
  if a.fails > 0 then update rpg_accounts set fails = 0 where name = a.name; end if;
  return jsonb_build_object('ok', true, 'name', a.display, 'saves', a.saves);
end $$;

create or replace function public.rpg_login(p_name text, p_pin text)
returns jsonb language sql security definer set search_path = public as $$
  select rpg_auth(p_name, p_pin);
$$;

create or replace function public.rpg_save(p_name text, p_pin text, p_slot int, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb;
begin
  if p_slot not between 0 and 2 or octet_length(p_data::text) > 500000 then
    return jsonb_build_object('ok', false, 'msg', 'Salvataggio non valido.');
  end if;
  r := rpg_auth(p_name, p_pin);
  if not (r->>'ok')::boolean then return r - 'saves'; end if;
  update rpg_accounts set saves = jsonb_set(saves, array[p_slot::text], p_data), updated_at = now()
  where name = lower(trim(p_name));
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.rpg_auth(text, text) from public, anon, authenticated;
grant execute on function public.rpg_register(text, text, jsonb) to anon;
grant execute on function public.rpg_login(text, text) to anon;
grant execute on function public.rpg_save(text, text, int, jsonb) to anon;
