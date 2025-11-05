-- Credit cards module -------------------------------------------------------

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
