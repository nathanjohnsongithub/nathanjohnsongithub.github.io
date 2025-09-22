-- Good Morning feature schema
-- Tables: settings, messages (user-authored pool), history (delivery log)

create table if not exists public.good_morning_settings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- recipient info
  email text,
  wants_email boolean not null default true,
  wants_push boolean not null default false,
  -- preferences
  category text not null default 'loving' check (category in ('funny','loving','playful')),
  delivery_time time not null default '08:00',
  tz text not null default 'America/Chicago',
  -- web push subscription JSON (optional)
  push_subscription jsonb,
  -- soft single row (optional) 
  is_active boolean not null default true
);

create table if not exists public.good_morning_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('funny','loving','playful')),
  content text not null
);

create table if not exists public.good_morning_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  delivered_at timestamptz,
  channel text not null check (channel in ('email','push')),
  category text not null check (category in ('funny','loving','playful')),
  content text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error text
);

-- helper view to fetch next item to send (if any) - optional, processing done in api

create index if not exists idx_gm_settings_active on public.good_morning_settings(is_active);
create index if not exists idx_gm_messages_cat on public.good_morning_messages(category);
create index if not exists idx_gm_history_sched on public.good_morning_history(scheduled_for);
create index if not exists idx_gm_history_status on public.good_morning_history(status);

-- updated_at trigger
create or replace function public.tg_set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists set_updated_at_gm_settings on public.good_morning_settings;
create trigger set_updated_at_gm_settings before update on public.good_morning_settings
for each row execute function public.tg_set_updated_at();
