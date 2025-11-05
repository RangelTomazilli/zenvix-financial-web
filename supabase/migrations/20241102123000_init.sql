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

-- Helpers ------------------------------------------------------------------

create or replace function public.is_family_member(p_family_id uuid)
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
  );
$$;

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$ language plpgsql;

grant execute on function public.is_family_member(uuid) to authenticated;

-- Credit cards --------------------------------------------------------------

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  nickname text,
  brand text,
  credit_limit numeric(14,2),
  billing_day smallint check (billing_day between 1 and 31),
  due_day smallint not null check (due_day between 1 and 31),
  closing_offset_days smallint not null default 7 check (closing_offset_days between 1 and 20),
  notify_threshold numeric(5,2) default 80.0,
  notify_days_before smallint not null default 5 check (notify_days_before between 1 and 15),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists credit_cards_family_id_idx on public.credit_cards(family_id);
create index if not exists credit_cards_owner_profile_id_idx on public.credit_cards(owner_profile_id);

alter table public.credit_cards enable row level security;

drop policy if exists "Family members view cards" on public.credit_cards;
create policy "Family members view cards" on public.credit_cards
  for select using (
    public.is_family_member(family_id)
    or exists (
      select 1 from public.profiles p
      where p.id = credit_cards.owner_profile_id
        and p.user_id = auth.uid()
    )
  );

drop policy if exists "Owners manage cards" on public.credit_cards;
create policy "Owners manage cards" on public.credit_cards
  for all using (
    public.is_family_owner(family_id)
  ) with check (
    public.is_family_owner(family_id)
  );

grant select, insert, update, delete on public.credit_cards to authenticated;

drop trigger if exists trigger_credit_cards_updated_at on public.credit_cards;
create trigger trigger_credit_cards_updated_at
  before update on public.credit_cards
  for each row
  execute procedure public.touch_updated_at();

-- Statements ----------------------------------------------------------------

create table if not exists public.credit_card_statements (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  reference_month date not null,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  status text not null default 'open' check (status in ('open','closed','paid','overdue')),
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists credit_card_statements_card_month_key
  on public.credit_card_statements(card_id, reference_month);
create index if not exists credit_card_statements_due_date_idx
  on public.credit_card_statements(due_date);

alter table public.credit_card_statements enable row level security;

drop policy if exists "Family members view statements" on public.credit_card_statements;
create policy "Family members view statements" on public.credit_card_statements
  for select using (
    exists (
      select 1
      from public.credit_cards c
      where c.id = credit_card_statements.card_id
        and (
          public.is_family_member(c.family_id)
          or exists (
            select 1 from public.profiles p
            where p.id = c.owner_profile_id
              and p.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Owners manage statements" on public.credit_card_statements;
create policy "Owners manage statements" on public.credit_card_statements
  for all using (
    exists (
      select 1
      from public.credit_cards c
      where c.id = credit_card_statements.card_id
        and public.is_family_owner(c.family_id)
    )
  ) with check (
    exists (
      select 1
      from public.credit_cards c
      where c.id = credit_card_statements.card_id
        and public.is_family_owner(c.family_id)
    )
  );

grant select, insert, update, delete on public.credit_card_statements to authenticated;

drop trigger if exists trigger_credit_card_statements_updated_at on public.credit_card_statements;
create trigger trigger_credit_card_statements_updated_at
  before update on public.credit_card_statements
  for each row
  execute procedure public.touch_updated_at();

-- Purchases -----------------------------------------------------------------

create table if not exists public.credit_card_purchases (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  statement_id uuid references public.credit_card_statements(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  description text,
  merchant text,
  amount numeric(14,2) not null,
  installments smallint not null default 1 check (installments between 1 and 48),
  purchase_date date not null,
  first_installment_month date not null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists credit_card_purchases_card_id_idx on public.credit_card_purchases(card_id);
create index if not exists credit_card_purchases_statement_id_idx on public.credit_card_purchases(statement_id);
create index if not exists credit_card_purchases_first_month_idx on public.credit_card_purchases(first_installment_month);

alter table public.credit_card_purchases enable row level security;

drop policy if exists "Family members view purchases" on public.credit_card_purchases;
create policy "Family members view purchases" on public.credit_card_purchases
  for select using (
    exists (
      select 1
      from public.credit_cards c
      where c.id = credit_card_purchases.card_id
        and (
          public.is_family_member(c.family_id)
          or exists (
            select 1 from public.profiles p
            where p.id = c.owner_profile_id
              and p.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Managers manage purchases" on public.credit_card_purchases;
drop policy if exists "Owners manage purchases" on public.credit_card_purchases;
create policy "Managers manage purchases" on public.credit_card_purchases
  for all using (
    exists (
      select 1
      from public.credit_cards c
      left join public.profiles pr on pr.id = c.owner_profile_id
      where c.id = credit_card_purchases.card_id
        and (
          public.is_family_owner(c.family_id)
          or (pr.user_id is not null and pr.user_id = auth.uid())
        )
    )
  ) with check (
    exists (
      select 1
      from public.credit_cards c
      left join public.profiles pr on pr.id = c.owner_profile_id
      where c.id = credit_card_purchases.card_id
        and (
          public.is_family_owner(c.family_id)
          or (pr.user_id is not null and pr.user_id = auth.uid())
        )
    )
  );

grant select, insert, update, delete on public.credit_card_purchases to authenticated;

drop trigger if exists trigger_credit_card_purchases_updated_at on public.credit_card_purchases;
create trigger trigger_credit_card_purchases_updated_at
  before update on public.credit_card_purchases
  for each row
  execute procedure public.touch_updated_at();

-- Installments --------------------------------------------------------------

create table if not exists public.credit_card_installments (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.credit_card_purchases(id) on delete cascade,
  statement_id uuid references public.credit_card_statements(id) on delete set null,
  installment_number smallint not null check (installment_number >= 1),
  amount numeric(14,2) not null,
  competence_month date not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending','billed','paid','cancelled')),
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists credit_card_installments_purchase_number_key
  on public.credit_card_installments(purchase_id, installment_number);
create index if not exists credit_card_installments_statement_idx
  on public.credit_card_installments(statement_id);
create index if not exists credit_card_installments_competence_idx
  on public.credit_card_installments(competence_month);
create index if not exists credit_card_installments_due_date_idx
  on public.credit_card_installments(due_date);

alter table public.credit_card_installments enable row level security;

drop policy if exists "Family members view installments" on public.credit_card_installments;
create policy "Family members view installments" on public.credit_card_installments
  for select using (
    exists (
      select 1
      from public.credit_card_purchases pur
      join public.credit_cards c on c.id = pur.card_id
      where pur.id = credit_card_installments.purchase_id
        and (
          public.is_family_member(c.family_id)
          or exists (
            select 1 from public.profiles p
            where p.id = c.owner_profile_id
              and p.user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Owners manage installments" on public.credit_card_installments;
create policy "Owners manage installments" on public.credit_card_installments
  for all using (
    exists (
      select 1
      from public.credit_card_purchases pur
      join public.credit_cards c on c.id = pur.card_id
      where pur.id = credit_card_installments.purchase_id
        and public.is_family_owner(c.family_id)
    )
  ) with check (
    exists (
      select 1
      from public.credit_card_purchases pur
      join public.credit_cards c on c.id = pur.card_id
      where pur.id = credit_card_installments.purchase_id
        and public.is_family_owner(c.family_id)
    )
  );

grant select, insert, update, delete on public.credit_card_installments to authenticated;

drop trigger if exists trigger_credit_card_installments_updated_at on public.credit_card_installments;
create trigger trigger_credit_card_installments_updated_at
  before update on public.credit_card_installments
  for each row
  execute procedure public.touch_updated_at();

create or replace function public.credit_card_usage(p_card_id uuid)
returns table (
  pending_amount numeric,
  billed_amount numeric,
  total_outstanding numeric
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(sum(case when i.status = 'pending' then i.amount else 0 end), 0) as pending_amount,
    coalesce(sum(case when i.status = 'billed' then i.amount else 0 end), 0) as billed_amount,
    coalesce(
      sum(case when i.status in ('pending','billed') then i.amount else 0 end),
      0
    ) as total_outstanding
  from public.credit_card_installments i
  join public.credit_card_purchases p on p.id = i.purchase_id
  join public.credit_cards c on c.id = p.card_id
  where p.card_id = p_card_id
    and (
      public.is_family_member(c.family_id)
      or public.is_family_owner(c.family_id)
      or exists (
        select 1 from public.profiles pr
        where pr.id = c.owner_profile_id
          and pr.user_id = auth.uid()
      )
    );
$$;

grant execute on function public.credit_card_usage(uuid) to authenticated;
