-- SacredPool Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Priests table
create table if not exists priests (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone_number text not null,
  ordination_date date,
  times_served integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  last_served_date date
);

-- Schedules table
create table if not exists schedules (
  id uuid default uuid_generate_v4() primary key,
  service_date date not null,
  priest_ids uuid[] default '{}',
  status text default 'in_progress' check (status in ('in_progress', 'confirmed')),
  created_at timestamptz default now()
);

-- Response log table
create table if not exists response_log (
  id uuid default uuid_generate_v4() primary key,
  priest_id uuid references priests(id),
  schedule_id uuid references schedules(id),
  message_sent timestamptz,
  response text default 'pending' check (response in ('yes', 'no', 'no_response', 'pending')),
  response_received_at timestamptz
);

-- Indexes
create index if not exists idx_priests_active on priests(is_active);
create index if not exists idx_priests_last_served on priests(last_served_date);
create index if not exists idx_schedules_date on schedules(service_date);
create index if not exists idx_response_log_pending on response_log(response) where response = 'pending';

-- RLS policies (disable for service role access)
alter table priests enable row level security;
alter table schedules enable row level security;
alter table response_log enable row level security;

-- Allow all access for anon key (private URL, no auth)
create policy "Allow all on priests" on priests for all using (true) with check (true);
create policy "Allow all on schedules" on schedules for all using (true) with check (true);
create policy "Allow all on response_log" on response_log for all using (true) with check (true);
