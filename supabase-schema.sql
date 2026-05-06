create extension if not exists pgcrypto;

create table if not exists public.learners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  normalized_name text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.paragraphs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.paragraph_assignments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  paragraph_id uuid not null references public.paragraphs(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'completed', 'reassigned')),
  assigned_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz
);

create unique index if not exists paragraph_assignments_unique_learner_paragraph
on public.paragraph_assignments (learner_id, paragraph_id);

create index if not exists paragraph_assignments_learner_id_idx on public.paragraph_assignments (learner_id);
create index if not exists paragraph_assignments_paragraph_id_idx on public.paragraph_assignments (paragraph_id);
create index if not exists paragraph_assignments_status_idx on public.paragraph_assignments (status);

create table if not exists public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learners(id) on delete cascade,
  paragraph_id uuid not null references public.paragraphs(id) on delete cascade,
  assignment_id uuid references public.paragraph_assignments(id) on delete set null,
  score integer not null default 0,
  total_words integer not null default 0,
  total_attempts integer not null default 0,
  accuracy integer not null default 0 check (accuracy between 0 and 100),
  completed_at timestamptz not null default timezone('utc', now())
);

create index if not exists reading_sessions_learner_id_idx on public.reading_sessions (learner_id);
create index if not exists reading_sessions_paragraph_id_idx on public.reading_sessions (paragraph_id);
create index if not exists reading_sessions_completed_at_idx on public.reading_sessions (completed_at desc);

create table if not exists public.pronunciation_issue_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.reading_sessions(id) on delete cascade,
  issue_key text not null,
  issue_label text not null,
  issue_count integer not null default 0,
  affected_words text[] not null default '{}',
  suggestions text[] not null default '{}'
);

create index if not exists pronunciation_issue_summaries_session_id_idx on public.pronunciation_issue_summaries (session_id);
create index if not exists pronunciation_issue_summaries_issue_key_idx on public.pronunciation_issue_summaries (issue_key);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists paragraphs_set_updated_at on public.paragraphs;

create trigger paragraphs_set_updated_at
before update on public.paragraphs
for each row
execute function public.set_updated_at();

alter table public.learners enable row level security;
alter table public.paragraphs enable row level security;
alter table public.paragraph_assignments enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.pronunciation_issue_summaries enable row level security;

drop policy if exists "public full access learners" on public.learners;
drop policy if exists "public full access paragraphs" on public.paragraphs;
drop policy if exists "public full access paragraph_assignments" on public.paragraph_assignments;
drop policy if exists "public full access reading_sessions" on public.reading_sessions;
drop policy if exists "public full access pronunciation_issue_summaries" on public.pronunciation_issue_summaries;

create policy "public full access learners"
on public.learners
for all
using (true)
with check (true);

create policy "public full access paragraphs"
on public.paragraphs
for all
using (true)
with check (true);

create policy "public full access paragraph_assignments"
on public.paragraph_assignments
for all
using (true)
with check (true);

create policy "public full access reading_sessions"
on public.reading_sessions
for all
using (true)
with check (true);

create policy "public full access pronunciation_issue_summaries"
on public.pronunciation_issue_summaries
for all
using (true)
with check (true);

create table if not exists public.admin_settings (
  id uuid primary key default gen_random_uuid(),
  password_hash text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists admin_settings_singleton_idx on public.admin_settings ((true));

create or replace function public.set_admin_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists admin_settings_set_updated_at on public.admin_settings;
create trigger admin_settings_set_updated_at
before update on public.admin_settings
for each row
execute function public.set_admin_updated_at();

insert into public.admin_settings (password_hash)
select crypt('TempoPhonetics', gen_salt('bf'))
where not exists (select 1 from public.admin_settings);

alter table public.admin_settings enable row level security;

create or replace function public.verify_admin_password(p_password text)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.admin_settings s
    where crypt(p_password, s.password_hash) = s.password_hash
    limit 1
  );
$$;

create or replace function public.set_admin_password(p_current text, p_new text)
returns boolean
language plpgsql
security definer
as $$
begin
  if not public.verify_admin_password(p_current) then
    return false;
  end if;

  update public.admin_settings
  set password_hash = crypt(p_new, gen_salt('bf')),
      updated_at = timezone('utc', now());

  return true;
end;
$$;
