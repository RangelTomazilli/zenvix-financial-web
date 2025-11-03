create extension if not exists "pgcrypto";

-- Families table
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  currency_code text not null default 'BRL',
  created_at timestamp with time zone not null default now()
);

-- Profiles table mirrors auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid references public.families(id) on delete set null,
  full_name text,
  email text,
  phone text,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamp with time zone not null default now()
);

create unique index if not exists profiles_user_id_key on public.profiles(user_id);
create index if not exists profiles_family_id_idx on public.profiles(family_id);

-- Categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income','expense')),
  created_at timestamp with time zone not null default now()
);

create index if not exists categories_family_id_idx on public.categories(family_id);
create unique index if not exists categories_unique_name_per_family on public.categories(family_id, lower(name), type);

-- Transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  type text not null check (type in ('income','expense')),
  amount numeric(12,2) not null,
  occurred_on date not null,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists transactions_family_id_idx on public.transactions(family_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);
create index if not exists transactions_occurred_on_idx on public.transactions(occurred_on);

create or replace function public.set_transactions_updated_at()
returns trigger as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_transactions_updated_at on public.transactions;
create trigger trigger_transactions_updated_at
before update on public.transactions
for each row
execute procedure public.set_transactions_updated_at();

-- Monthly totals helper
create or replace function public.transactions_monthly_totals(
  p_family_id uuid,
  p_months_back integer default 6
)
returns table (month text, income numeric, expense numeric)
language sql
security definer
set search_path = public
as $$
  select
    to_char(date_trunc('month', occurred_on), 'YYYY-MM') as month,
    sum(case when type = 'income' then amount else 0 end) as income,
    sum(case when type = 'expense' then amount else 0 end) as expense
  from public.transactions
  where family_id = p_family_id
    and occurred_on >= date_trunc('month', current_date) - ((p_months_back - 1) * interval '1 month')
  group by 1
  order by 1;
$$;

grant execute on function public.transactions_monthly_totals(uuid, integer) to authenticated;

-- Row Level Security policies
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Owners manage family" on public.families;
drop policy if exists "Authenticated create families" on public.families;
create policy "Authenticated create families" on public.families
  for insert with check (true);
create policy "Owners manage family" on public.families
  for all using (
    exists (
      select 1
      from public.profiles p
      where p.family_id = families.id
        and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.profiles p
      where p.family_id = families.id
        and p.user_id = auth.uid()
        and p.role = 'owner'
    )
  );

drop policy if exists "Users view own profile" on public.profiles;
create policy "Users view own profile" on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists "Owners manage family profiles" on public.profiles;
create policy "Owners manage family profiles" on public.profiles
  for all using (
    user_id = auth.uid() or public.is_family_owner(family_id)
  ) with check (
    user_id = auth.uid() or public.is_family_owner(family_id)
  );

drop policy if exists "Family members read categories" on public.categories;
create policy "Family members read categories" on public.categories
  for select using (
    exists (
      select 1 from public.profiles p
      where p.family_id = categories.family_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Owners manage categories" on public.categories;
create policy "Owners manage categories" on public.categories
  for all using (
    exists (
      select 1 from public.profiles p
      where p.family_id = categories.family_id
        and p.user_id = auth.uid()
        and p.role = 'owner'
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.family_id = categories.family_id
        and p.user_id = auth.uid()
        and p.role = 'owner'
    )
  );

drop policy if exists "Family members read transactions" on public.transactions;
create policy "Family members read transactions" on public.transactions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.family_id = transactions.family_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Members insert own transactions" on public.transactions;
create policy "Members insert own transactions" on public.transactions
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.family_id = transactions.family_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Members manage family transactions" on public.transactions;
create policy "Members manage family transactions" on public.transactions
  for all using (
    exists (
      select 1 from public.profiles p
      where p.family_id = transactions.family_id
        and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.family_id = transactions.family_id
        and p.user_id = auth.uid()
    )
  );

-- Helper function to sync profile after sign up (optional but recommended)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, user_id, full_name, email, role)
  values (new.id, new.id, new.raw_user_meta_data->>'full_name', new.email, 'member')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.current_user_email()
returns text
language sql
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email', ''));
$$;

create or replace function public.is_family_owner(p_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles
    where family_id = p_family_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

create or replace function public.fetch_invite_by_token(p_token text)
returns table (
  id uuid,
  family_id uuid,
  invitee_email text,
  status text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone,
  token text,
  family_name text,
  inviter_name text,
  inviter_email text
)
language sql
security definer
set search_path = public
as $$
  select
    fi.id,
    fi.family_id,
    fi.invitee_email,
    fi.status,
    fi.expires_at,
    fi.created_at,
    fi.token,
    f.name as family_name,
    p.full_name as inviter_name,
    p.email as inviter_email
  from public.family_invites fi
  left join public.families f on f.id = fi.family_id
  left join public.profiles p on p.id = fi.inviter_id
  where fi.token = p_token
  limit 1;
$$;

create or replace function public.expire_family_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.family_invites
     set status = 'expired'
   where status = 'pending'
     and expires_at is not null
     and expires_at < timezone('utc', now());

  get diagnostics affected = row_count;
  return coalesce(affected, 0);
end;
$$;

create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_email text not null,
  token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create index if not exists family_invites_family_id_idx on public.family_invites(family_id);
create index if not exists family_invites_invitee_email_idx on public.family_invites(lower(invitee_email));

alter table public.family_invites enable row level security;

drop policy if exists "Owners create invites" on public.family_invites;
create policy "Owners create invites" on public.family_invites
  for insert with check (
    inviter_id = auth.uid() and public.is_family_owner(family_id)
  );

drop policy if exists "Owners manage invites" on public.family_invites;
create policy "Owners manage invites" on public.family_invites
  for all using (
    public.is_family_owner(family_id)
  ) with check (
    public.is_family_owner(family_id)
  );

drop policy if exists "Invitee can view invite" on public.family_invites;
create policy "Invitee can view invite" on public.family_invites
  for select using (
    lower(invitee_email) = public.current_user_email()
  );

drop policy if exists "Invitee can accept invite" on public.family_invites;
create policy "Invitee can accept invite" on public.family_invites
  for update using (
    lower(invitee_email) = public.current_user_email()
  ) with check (
    lower(invitee_email) = public.current_user_email()
  );

grant select, insert, update, delete on public.family_invites to authenticated;
grant select, update (family_id, role, full_name, email) on public.profiles to authenticated;
grant execute on function public.fetch_invite_by_token(text) to anon, authenticated;
grant execute on function public.expire_family_invites() to service_role;
