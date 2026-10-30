# Fiiller Café — Auditoría de pedidos, recetas e inventario (29 oct 2026)

## Hallazgo confirmado en la base real
- `filler_place_order` bloquea y decrementa `filler_products.stock` por cantidad vendida.
- No descuenta `filler_inventory_items.quantity` por ingrediente.
- No hay tablas de recetas `filler_*` en el esquema público.
- Instantánea de lectura: 136 productos, 193 insumos, 3 pedidos digitales, 7 renglones, 21 movimientos de inventario.
- No se hicieron escrituras de inventario, ventas ni pedidos.

## Diseño propuesto (sin desplegar)
1. Tabla `filler_recipe_components`: producto, insumo, cantidad por unidad, unidad, verificación y activación.
2. Tabla `filler_order_ingredient_consumptions`: historial inmutable por pedido/renglón/insumo y clave de idempotencia.
3. Al confirmar pedido, registrar consumos y disminuir insumos en **la misma transacción** que crea el pedido.
4. Bloquear filas de inventario en orden determinista para evitar interbloqueos entre pedidos concurrentes.
5. Si falta receta activa, no descontar ingredientes a ciegas; decidir entre bloquear la venta de preparados o mantener lista explícita de productos sin receta (retail).
6. Sumar consumos por insumo de todas las líneas (y extras con su propia receta) antes de validar disponibilidad.
7. Usar `unit` y conversiones explícitas verificadas (g, ml, piezas); impedir conversiones implícitas.
8. Registrar movimientos `salida_venta` vinculados al pedido. Actualmente la tabla de movimientos debe revisarse antes de decidir el nombre/tipo autorizado.
9. Cancelaciones: realizar una reversión única y auditable, nunca una devolución automática sin verificar preparación/entrega.
10. Mantener reglas RLS y RPC con autorización del personal **en servidor**.

## Pruebas obligatorias
- Una chapata descuenta exactamente gramos/piezas según receta y una sola vez.
- Dos pedidos simultáneos no sobre-venden el último insumo.
- Si un insumo es insuficiente, falla toda la transacción sin ticket ni cambio de existencias.
- Un mismo pedido reintentado no registra doble consumo.
- Un extra de jamón suma consumo adicional.
- Productos retail sin receta siguen descontando solo `filler_products.stock`.
- Cancelación antes/después de preparación no duplica entradas.
- Una persona sin rol admin no puede alterar recetas ni existencias.
- Ningún pedido histórico se modifica o descuenta retroactivamente.

## Pendiente antes de activar
- Capturar/validar recetas reales y vincularlas con códigos de insumo.
- Determinar el evento de consumo: al crear el pedido o al iniciar preparación (recomendación: reservar al crear y consumir al preparar, si se implementa un ledger de reservas).
- Verificar los constraints y políticas existentes de tablas de movimientos.
- Ejecutar pruebas en staging con copia anonimizada; revisar impacto y crear migración formal.
- Mantener separados los sistemas de ventas Arrow y pedidos digitales.
