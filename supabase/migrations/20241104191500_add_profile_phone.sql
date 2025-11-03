alter table public.profiles
  add column if not exists phone text;

create index if not exists profiles_phone_idx on public.profiles using btree (phone);
