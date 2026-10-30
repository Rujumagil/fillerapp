-- Corrección puntual para platillos con categoría acentuada (Fiiller).
-- Conserva la definición y permisos de filler_place_order; reemplaza solo su condición de categoría.
DO $$
DECLARE
 fn text;
 original text := 'v_product.category ~* ''(chilaquiles|plancha|sandwich|ensalada|mollete|torta|croque|baguette|panini)''';
 replacement text := 'translate(lower(v_product.category),''áéíóúü'',''aeiouu'') ~ ''(chilaquiles|plancha|sandwich|ensalada|mollete|torta|croque|baguette|panini)''';
BEGIN
 SELECT pg_get_functiondef(p.oid) INTO fn
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname='filler_place_order';
 IF fn IS NULL THEN RAISE EXCEPTION 'filler_place_order no existe'; END IF;
 IF strpos(fn,replacement)>0 THEN RETURN; END IF;
 IF strpos(fn,original)=0 THEN RAISE EXCEPTION 'La condición esperada cambió: revisar manualmente antes de migrar'; END IF;
 EXECUTE replace(fn,original,replacement);
END $$;
