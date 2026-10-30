-- Fiiller Café: contenido promocional administrable, sin ventas ni descuentos.
create table if not exists public.filler_storefront_features (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('promotion','upcoming')),
 title text not null check (char_length(title) between 3 and 90),
 description text not null default '' check (char_length(description)<=300),
 image_url text check (image_url is null or char_length(image_url)<=700),
 eyebrow text not null default '' check (char_length(eyebrow)<=65),
 starts_on date,
 ends_on date,
 sort_order integer not null default 100 check (sort_order between 0 and 10000),
 is_published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 created_by uuid references auth.users(id),
 constraint filler_feature_dates check (starts_on is null or ends_on is null or ends_on>=starts_on),
 constraint filler_feature_image check (image_url is null or image_url ~ '^(https://[^ ]+|assets/[A-Za-z0-9_./-]+)$')
);
alter table public.filler_storefront_features enable row level security;
revoke all on public.filler_storefront_features from anon,authenticated;
grant select on public.filler_storefront_features to anon,authenticated;
grant insert,update,delete on public.filler_storefront_features to authenticated;
create policy "Fiiller published offers public" on public.filler_storefront_features
for select to anon,authenticated using (
 is_published and (starts_on is null or starts_on <= (now() at time zone 'America/Mexico_City')::date)
 and (ends_on is null or ends_on >= (now() at time zone 'America/Mexico_City')::date)
);
create policy "Fiiller admin reads all offers" on public.filler_storefront_features
for select to authenticated using (
 exists (select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin')
);
create policy "Fiiller admin creates offers" on public.filler_storefront_features
for insert to authenticated with check (
 created_by=(select auth.uid()) and exists (select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin')
);
create policy "Fiiller admin edits offers" on public.filler_storefront_features
for update to authenticated using (
 exists (select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin')
) with check (
 exists (select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin')
);
create policy "Fiiller admin deletes offers" on public.filler_storefront_features
for delete to authenticated using (
 exists (select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin')
);
