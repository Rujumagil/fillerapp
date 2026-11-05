# Fiiller Café · Puerta de integración de inventario

Estado: **BLOQUEADO PARA PRODUCCIÓN**. Solo simulación; cero operaciones en Supabase.

## Datos verificados en el repositorio
- `filler-cloud.js`: `FillerCloud.orders()` lee `filler_orders` y `filler_order_items`; devuelve artículos con `id`, `name`, `qty`, `extras`, pero **sin `recipe_id`**.
- `FillerCloud.orders()` **no devuelve confirmación verificable de pago**. El estado de preparación (`Preparando`, `Listo`, `Entregado`) NO equivale a un pago acreditado.
- `FillerCloud.updateOrder()` modifica el estado del pedido en Supabase. No conectarlo al simulador ni realizar salidas desde el cliente.
- `almacen-fiiller.js` lee inventario, movimientos y lotes con sesión de administrador.
- REC-001, REC-002, REC-003 tienen códigos OCS y conversiones documentadas. Los descuentos siguen pendientes.

## Simulador preparado
- `warehouse-consumption-engine.cjs`: sumas por SKU, conversiones, folios idempotentes y cancelaciones solo en memoria.
- `warehouse-order-event-adapter.cjs`: recibe eventos sintéticos con `source=verified_backend_fixture`, `payment_confirmed=true`, `fulfillment_status=Entregado`, `recipe_id`, `quantity` y `extras=[]`.
- Este marcador de fuente es una **convención de prueba**, NO autenticación ni autorización: cualquier cliente puede falsificarla. Nunca invocarlo desde navegador como prueba de pago real.
- Los extras se bloquean deliberadamente hasta contar con recetas y cantidades propias.

## Condiciones antes de integrar
1. Crear un mapeo autoritativo producto/variante/extras -> `recipe_id`/consumos, controlado por servidor y probado con el menú activo.
2. Comprobar el evento de venta pagada mediante registro transaccional del servidor y política definida para efectivo, pedidos anticipados y cancelaciones; no inferirlo del estado `Entregado`.
3. Diseñar RPC transaccional en ambiente de pruebas: folio único por movimiento, deducción una sola vez, reversión autorizada y bitácora por SKU.
4. Resolver fracciones de unidad para salsa (bolsa 3 kg), crema (cubeta 4 kg), aceite (botella 1 L), huevo kg con cáscara y pollo kg crudo; conservar precisión de cálculo.
5. Probar ventas repetidas, reintentos concurrentes, cambios de artículos, agotados, devoluciones, extras y fallos parciales con rollback.
6. Auditar permisos y RLS. La web pública nunca debe poder escribir movimientos de inventario.
7. Ejecutar `npm run test:warehouse` en GitHub Actions y verificar el resultado en la pestaña Actions; una configuración YAML creada no demuestra una corrida exitosa.
8. Comparar antes/después en base de pruebas exclusivamente. Obtener aprobación explícita antes de habilitar escritura en producción.

## Comando
```bash
npm run test:warehouse
```

## Garantía de esta etapa
Se añadieron archivos `tests/`, el script de pruebas de `package.json` y el workflow de GitHub Actions. **No se modificaron** flujos de pedidos ni código de descuentos productivos. No se invocaron APIs de inventario.
