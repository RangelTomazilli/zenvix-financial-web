-- Ajusta políticas para permitir atribuição de transações a qualquer membro da família
alter table public.transactions
  alter column user_id drop not null;

drop policy if exists "Members insert own transactions" on public.transactions;
drop policy if exists "Members manage family transactions" on public.transactions;

create policy "Members manage family transactions" on public.transactions
  for all
  using (
    exists (
      select 1
      from public.profiles actor
      where actor.family_id = transactions.family_id
        and actor.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.profiles actor
      where actor.family_id = transactions.family_id
        and actor.user_id = auth.uid()
    )
    and (
      transactions.user_id is null
      or exists (
        select 1
        from public.profiles member
        where member.id = transactions.user_id
          and member.family_id = transactions.family_id
      )
    )
  );
