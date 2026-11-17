-- Cloud Search database schema.
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query).

create table if not exists public.search_history (
  id bigint generated always as identity primary key,
  query text not null,
  engine text not null check (engine in ('ddg', 'google', 'url')),
  created_at timestamptz not null default now()
);

create table if not exists public.bookmarks (
  id bigint generated always as identity primary key,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

-- Reachable only through /api/secret-bookmarks, which requires the 4-digit code.
create table if not exists public.secret_bookmarks (
  id bigint generated always as identity primary key,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create index if not exists search_history_recent_idx
  on public.search_history (created_at desc, id desc);

create index if not exists bookmarks_recent_idx
  on public.bookmarks (created_at desc, id desc);

create index if not exists secret_bookmarks_recent_idx
  on public.secret_bookmarks (created_at desc, id desc);

alter table public.search_history enable row level security;
alter table public.bookmarks enable row level security;
alter table public.secret_bookmarks enable row level security;

-- A publishable key (sb_publishable_...) runs as the `anon` Postgres role.
-- There is no login in this single-user app, so allow that role full access.
-- A secret key (sb_secret_...) bypasses RLS entirely and needs no policies.
drop policy if exists "anon_full_access_history" on public.search_history;
create policy "anon_full_access_history"
  on public.search_history
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon_full_access_bookmarks" on public.bookmarks;
create policy "anon_full_access_bookmarks"
  on public.bookmarks
  for all
  to anon
  using (true)
  with check (true);

drop policy if exists "anon_full_access_secret_bookmarks" on public.secret_bookmarks;
create policy "anon_full_access_secret_bookmarks"
  on public.secret_bookmarks
  for all
  to anon
  using (true)
  with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.search_history to anon, authenticated;
grant select, insert, update, delete on public.bookmarks to anon, authenticated;
grant select, insert, update, delete on public.secret_bookmarks to anon, authenticated;

-- Keep only the newest KEEP rows so storage stays tiny.
create or replace function public.prune_old_rows(p_table text, p_keep integer)
returns void
language plpgsql
as $$
begin
  execute format(
    'delete from public.%I where id not in (select id from public.%I order by created_at desc, id desc limit $1)',
    p_table,
    p_table
  ) using p_keep;
end;
$$;

-- Insert a search and prune in one call.
create or replace function public.add_search(p_query text, p_engine text)
returns public.search_history
language plpgsql
as $$
declare
  v_row public.search_history;
begin
  insert into public.search_history (query, engine)
  values (p_query, p_engine)
  returning * into v_row;

  perform public.prune_old_rows('search_history', 100);
  return v_row;
end;
$$;

-- Insert a bookmark and prune in one call.
create or replace function public.add_bookmark(p_label text, p_url text)
returns public.bookmarks
language plpgsql
as $$
declare
  v_row public.bookmarks;
begin
  insert into public.bookmarks (label, url)
  values (p_label, p_url)
  returning * into v_row;

  perform public.prune_old_rows('bookmarks', 100);
  return v_row;
end;
$$;

-- Insert a secret bookmark and prune in one call.
create or replace function public.add_secret_bookmark(p_label text, p_url text)
returns public.secret_bookmarks
language plpgsql
as $$
declare
  v_row public.secret_bookmarks;
begin
  insert into public.secret_bookmarks (label, url)
  values (p_label, p_url)
  returning * into v_row;

  perform public.prune_old_rows('secret_bookmarks', 100);
  return v_row;
end;
$$;

grant execute on function public.prune_old_rows(text, integer) to anon, authenticated;
grant execute on function public.add_search(text, text) to anon, authenticated;
grant execute on function public.add_bookmark(text, text) to anon, authenticated;
grant execute on function public.add_secret_bookmark(text, text) to anon, authenticated;
