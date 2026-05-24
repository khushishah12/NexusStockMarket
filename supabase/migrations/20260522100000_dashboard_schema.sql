-- Dashboard features: watchlist + profile hardening

create table if not exists public.watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  symbol text not null,
  exchange text not null default 'NSE' check (exchange in ('NSE', 'BSE')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists watchlist_items_user_symbol_exchange_idx
  on public.watchlist_items (user_id, symbol, exchange);

comment on table public.watchlist_items is 'Per-user saved stocks for the watchlist UI';

alter table public.watchlist_items enable row level security;

create policy "Watchlist select own"
  on public.watchlist_items for select
  using (auth.uid() = user_id);

create policy "Watchlist insert own"
  on public.watchlist_items for insert
  with check (auth.uid() = user_id);

create policy "Watchlist update own"
  on public.watchlist_items for update
  using (auth.uid() = user_id);

create policy "Watchlist delete own"
  on public.watchlist_items for delete
  using (auth.uid() = user_id);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.watchlist_items to authenticated;
grant select, insert, update on public.profiles to authenticated;
