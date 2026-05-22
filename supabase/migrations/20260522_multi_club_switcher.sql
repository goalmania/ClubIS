-- Multi-Club Switcher: tabella user_clubs + RLS + backfill

-- ── 1. Tabella ──────────────────────────────────────────────────────────────
create table if not exists user_clubs (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  club_id     uuid        not null references clubs(id) on delete cascade,
  role        text        not null,
  status      text        not null default 'pending', -- 'pending' | 'accepted' | 'rejected'
  invited_by  uuid        references auth.users(id),
  invited_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (user_id, club_id)
);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
alter table user_clubs enable row level security;

-- Ogni utente vede solo le proprie righe
create policy "user sees own club memberships"
  on user_clubs for select
  using (auth.uid() = user_id);

-- Ogni utente può aggiornare solo le proprie righe (per accettare l'invito)
create policy "user updates own memberships"
  on user_clubs for update
  using (auth.uid() = user_id);

-- Solo presidente/admin può inserire inviti via client (le API admin bypassano RLS)
create policy "admin can insert invites"
  on user_clubs for insert
  with check (
    exists (
      select 1 from user_clubs uc
      where uc.club_id  = user_clubs.club_id
        and uc.user_id  = auth.uid()
        and uc.role     in ('presidente', 'admin')
        and uc.status   = 'accepted'
    )
  );

-- ── 3. Grants ────────────────────────────────────────────────────────────────
grant select, insert, update on user_clubs to anon, authenticated;

-- ── 4. Backfill: tutti gli utenti esistenti ──────────────────────────────────
-- Ogni utente in `utenti` ottiene una riga accepted in user_clubs
insert into user_clubs (user_id, club_id, role, status, accepted_at)
select
  u.id       as user_id,
  u.club_id  as club_id,
  u.ruolo::text as role,
  'accepted' as status,
  coalesce(u.created_at, now()) as accepted_at
from utenti u
where u.club_id is not null
on conflict (user_id, club_id) do nothing;
