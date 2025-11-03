create or replace function public.remove_family_member(
  p_family_id uuid,
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
begin
  select id, family_id
    into target
  from public.profiles
  where id = p_profile_id
    for update;

  if not found then
    raise exception 'Perfil não encontrado';
  end if;

  if target.family_id is distinct from p_family_id then
    raise exception 'Perfil não pertence à família informada';
  end if;

  if target.family_id is not null
     and not public.is_family_owner(target.family_id)
     and target.id <> auth.uid() then
    raise exception 'Sem autorização para remover este membro';
  end if;

  update public.profiles
     set family_id = null,
         role = case when target.id = auth.uid() then role else role end
   where id = target.id;
end;
$$;

grant execute on function public.remove_family_member(uuid, uuid) to authenticated;
