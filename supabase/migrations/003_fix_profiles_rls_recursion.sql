-- =============================================
-- Fix Infinite Recursion in profiles RLS Policy
-- =============================================

-- Helper function to check if user is admin (bypasses RLS with SECURITY DEFINER)
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

-- Drop the recursive policy
drop policy if exists "Admins can view all profiles" on public.profiles;

-- Recreate using the helper function (avoids infinite recursion)
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin(auth.uid()));
