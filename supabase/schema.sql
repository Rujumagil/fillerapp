-- Filler Café | esquema inicial preparado, NO aplicado a producción
-- Aplicar únicamente a un proyecto Supabase dedicado a Filler Café.
create extension if not exists pgcrypto;
create table if not exists public.filler_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','cocina'))
);
create table if not exists public.filler_products (
  id text primary key,
  category text not null,
  name text not null,
  price numeric(10,2) not null check (price>=0),
  stock integer not null default 0 check (stock>=0),
  image_url text,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
create table if not exists public.filler_orders (
  id uuid primary key default gen_random_uuid(),
  public_code text unique not null,
  customer text not null,
  phone text not null,
  pickup text not null,
  notes text not null default '',
  status text not null default 'Nuevo' check (status in ('Nuevo','Preparando','Listo','Entregado','Cancelado')),
  total numeric(10,2) not null check (total>=0),
  created_at timestamptz not null default now(),
  status_updated_at timestamptz not null default now(),
  tracking_token uuid not null default gen_random_uuid()
);
create table if not exists public.filler_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.filler_orders(id) on delete cascade,
  product_id text references public.filler_products(id) on delete set null,
  name text not null,
  price numeric(10,2) not null,
  qty integer not null check (qty>0)
);
create index if not exists filler_orders_created_idx on public.filler_orders(created_at desc);
create index if not exists filler_order_items_order_idx on public.filler_order_items(order_id);
alter table public.filler_staff enable row level security;
alter table public.filler_products enable row level security;
alter table public.filler_orders enable row level security;
alter table public.filler_order_items enable row level security;
revoke all on public.filler_staff,public.filler_products,public.filler_orders,public.filler_order_items from anon,authenticated;
grant select on public.filler_products to anon,authenticated;
grant select on public.filler_staff to authenticated;
grant select on public.filler_orders,public.filler_order_items to authenticated;
grant insert,update,delete on public.filler_products to authenticated;
grant update on public.filler_orders to authenticated;
create policy "personal lee su perfil" on public.filler_staff for select to authenticated using (user_id=(select auth.uid()));
create policy "catalogo publico" on public.filler_products for select to anon,authenticated using (active);
create policy "personal ve productos" on public.filler_products for select to authenticated using (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid())));
create policy "admin agrega productos" on public.filler_products for insert to authenticated with check (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy "admin actualiza productos" on public.filler_products for update to authenticated using (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin')) with check (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy "admin elimina productos" on public.filler_products for delete to authenticated using (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid()) and s.role='admin'));
create policy "personal ve pedidos" on public.filler_orders for select to authenticated using (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid())));
create policy "personal ve renglones" on public.filler_order_items for select to authenticated using (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid())));
create policy "personal cambia pedidos" on public.filler_orders for update to authenticated using (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid()))) with check (exists(select 1 from public.filler_staff s where s.user_id=(select auth.uid())));
-- La creación de pedidos debe hacerse con una Edge Function segura que:
-- valide cantidades, precios y disponibilidad contra esta base,
-- descuente existencias en una transacción y devuelva id + tracking_token.
-- No otorgar INSERT público en filler_orders ni exponer tracking_token a terceros.
-- Notificaciones push requieren suscripciones Web Push, VAPID y un emisor backend.
