alter table public.matrimony_profile_full
add column if not exists partner_preferences jsonb not null default '{}'::jsonb;

create index if not exists idx_matrimony_profile_full_preferences
on public.matrimony_profile_full using gin (partner_preferences);

notify pgrst, 'reload schema';
