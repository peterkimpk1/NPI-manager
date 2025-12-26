-- =============================================
-- NPI Manager - Initial Schema
-- Sprint 0: Foundation & Authentication
-- =============================================

-- =============================================
-- PROFILES TABLE
-- Extends auth.users with application-specific data
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('admin', 'manager', 'user', 'viewer')),
  department text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Index for role lookups
create index idx_profiles_role on public.profiles(role);

-- =============================================
-- AUDIT LOG TABLE
-- Tracks user actions for security and compliance
-- =============================================
create table public.audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on audit_log
alter table public.audit_log enable row level security;

-- RLS Policies for audit_log
create policy "Admins and managers can view audit logs"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'manager')
    )
  );

create policy "System can insert audit logs"
  on public.audit_log for insert
  with check (true);

-- Indexes for audit log queries
create index idx_audit_log_user_id on public.audit_log(user_id);
create index idx_audit_log_action on public.audit_log(action);
create index idx_audit_log_created_at on public.audit_log(created_at desc);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to handle new user signup (auto-create profile)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

-- Trigger for auto-creating profile on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to log audit entries
create or replace function public.log_audit_entry(
  p_user_id uuid,
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_details jsonb default '{}'::jsonb,
  p_ip_address text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_log_id uuid;
begin
  insert into public.audit_log (user_id, action, entity_type, entity_id, details, ip_address, user_agent)
  values (p_user_id, p_action, p_entity_type, p_entity_id, p_details, p_ip_address::inet, p_user_agent)
  returning id into v_log_id;

  return v_log_id;
end;
$$;

-- Function to update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Trigger for updating updated_at on profiles
create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();
