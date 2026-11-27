# Fiiller Café · Recepción compacta de inventario (27 nov 2026)

## Alcance
- Búsqueda compacta por nombre sin acentos, SKU y código de barras; filtros por familia, favoritos locales, recientes, bajo mínimo y pendientes de conteo.
- Registro individual de entrada, salida o conteo con saldo previo/posterior, referencia y confirmación.
- Captura opcional de lote y caducidad **en la misma pantalla de entrada**.
- Borrador de recepción de hasta 50 insumos con confirmación antes de aplicar los cambios.
- Los movimientos existentes siguen usando `filler_inventory_move` y `filler_inventory_count`; los lotes usan `filler_inventory_lot_save`.

## Comprobado sin modificar datos reales
- [x] Ambos scripts de almacén pasan comprobación sintáctica.
- [x] Todos los identificadores de la pantalla rápida referenciados por JavaScript existen en HTML.
- [x] Simulación de registro múltiple: añadir al borrador no produce escrituras; confirmar sí produce una entrada en el inventario.
- [x] Simulación de saldo insuficiente: salida bloqueada antes de enviar.
- [x] Simulación de fallo de lote: movimiento guardado una sola vez; la recuperación reenvía únicamente el lote.

## Pruebas manuales pendientes con credenciales admin / datos de prueba
- [ ] Buscar por nombre y código de barras usando lector USB y escáner móvil.
- [ ] Verificar guardado de favoritos y recientes en navegación y recarga.
- [ ] Revisar filtros de stock bajo y pendientes de conteo.
- [ ] Registrar entrada con lote y caducidad nueva; comprobar stock +1 y solo un lote.
- [ ] Bloquear el intento de alta del mismo lote en el mismo insumo.
- [ ] Registrar lote caducado y confirmar que se rechaza.
- [ ] Registrar conteo físico y salida (sin lote) y comprobar historial.
- [ ] Crear recepción con 3 líneas y confirmar folios y saldos.
- [ ] Probar pérdida de conexión al guardar lote; verificar recuperación sin repetir movimiento.
- [ ] Probar cambios concurrentes de existencias desde dos sesiones.
- [ ] Verificar vista en pantalla chica y accesibilidad por teclado.
- [ ] Comprobar que visitantes sin rol admin no pueden leer ni escribir inventario.
- [ ] Confirmar la publicación desde GitHub Pages una vez fusionado a main.

## Restricciones y medidas de seguridad
- **Recepción múltiple no es transacción atómica**: cada línea se registra en orden. En fallos o respuesta ambigua se detiene y se indica revisión manual; nunca se intenta enviar el mismo movimiento automáticamente.
- La prevención de duplicados y de saldos concurrentes a nivel cliente no sustituye límites, bloqueos, permisos y operaciones atómicas en la base de datos.
- Lote y existencia se escriben en llamadas separadas. Si falla el lote después de la entrada, se ofrece guardar **solo** el lote pendiente.
- Los lotes se asocian a la cantidad introducida en la **unidad base del almacén**; ninguna presentación (caja, botella, bolsa) se convierte automáticamente. Se debe confirmar equivalencia por SKU antes de implementarla.
- Proveedor, referencia y folio se almacenan por ahora en la **nota** del movimiento, no en campos normalizados.
- El sistema no cambia los registros anteriores ni altera reglas de consumo automático de recetas.
