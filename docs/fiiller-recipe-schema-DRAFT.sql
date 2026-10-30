-- PROPUESTA NO APLICADA A PRODUCCION.
-- Fiiller Cafe: relacion recetario ↔ productos ↔ insumos.
-- Revisar con DBA antes de migrar. Sin grants a anon/authenticated.
-- El consumo se debe registrar en la MISMA transaccion de filler_place_order,
-- despues de tener recetas verificadas, con bloqueos y validacion de unidades.

begin;

create table if not exists public.filler_recipe_components (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.filler_products(id) on delete restrict,
  inventory_item_id uuid not null references public.filler_inventory_items(id) on delete restrict,
  quantity_per_unit numeric(14,3) not null check (quantity_per_unit > 0),
  -- Debe coincidir con filler_inventory_items.unit; validar al cargar receta
  unit text not null check (length(trim(unit)) between 1 and 20),
  active boolean not null default false,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id,inventory_item_id),
  constraint filler_recipe_active_requires_verification
    check (not active or (verified_at is not null and verified_by is not null))
);
create index if not exists filler_recipe_components_inventory_idx
  on public.filler_recipe_components(inventory_item_id);

create table if not exists public.filler_order_ingredient_consumptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.filler_orders(id) on delete restrict,
  order_item_id bigint not null references public.filler_order_items(id) on delete restrict,
  inventory_item_id uuid not null references public.filler_inventory_items(id) on delete restrict,
  quantity_consumed numeric(14,3) not null check (quantity_consumed > 0),
  unit text not null,
  created_at timestamptz not null default now(),
  -- Un consumo por insumo y renglon; evita duplicarlo al reintentar.
  unique(order_item_id,inventory_item_id)
);
create index if not exists filler_order_ingredient_consumptions_order_idx
  on public.filler_order_ingredient_consumptions(order_id);

alter table public.filler_recipe_components enable row level security;
alter table public.filler_order_ingredient_consumptions enable row level security;

-- Ninguna politica publica. Acceso administrativo mediante RPC
-- con auth.uid(), rol comprobado y grants EXECUTE explicitos.
-- No crear todavia el trigger ni modificar filler_place_order.
commit;
