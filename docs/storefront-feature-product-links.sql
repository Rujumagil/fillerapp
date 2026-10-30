-- Vínculo opcional: el anuncio apunta a un producto real, no modifica su precio.
alter table public.filler_storefront_features
  add column if not exists product_id text references public.filler_products(id) on delete set null;
create index if not exists filler_storefront_features_product_idx
  on public.filler_storefront_features(product_id)
  where product_id is not null;
-- Solo las promociones pueden ser comprables; novedades continúan informativas.
alter table public.filler_storefront_features
  add constraint filler_feature_link_only_promotion
  check (product_id is null or kind = 'promotion');
