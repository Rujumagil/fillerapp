# Fiiller Café · Revisión física de stock bajo — QA

## Objetivo
Conectar las alertas del centro administrativo y el resumen del almacén con la revisión del insumo, su saldo y un conteo físico en la misma pantalla sin generar compras ni ajustar existencias hasta que el administrador confirme.

## Flujo
1. Desde Control Fiiller, seleccionar el KPI **Insumos bajo mínimo** o la tarea **Existencias por revisar**.
2. Abrir `almacen-fiiller.html#review-low`: se activa **Registro rápido** con filtro bajo mínimo y conteo físico predeterminado.
3. Ver los insumos aún bajo mínimo, priorizando los que no tienen conteo registrado hoy.
4. Presionar **Revisar siguiente pendiente** o elegir uno. Ver nombre, SKU, unidad, saldo actual y mínimo.
5. Capturar la cantidad física **total** y confirmar el ajuste explícitamente. La operación llama al RPC existente `filler_inventory_count`, solo bajo permisos de admin.
6. Actualizar el conteo del día. Si el saldo sigue bajo mínimo, conservar la alerta con estado **Contado hoy · sigue bajo mínimo**. Si supera el mínimo, retirar el artículo de las alertas actuales.
7. Regresar a Control Fiiller. El indicador se actualiza al recargar o actualizar; no se duplican movimientos.

## Pruebas simuladas
- [x] Se muestran solo artículos con mínimo mayor a cero y existencia menor o igual al mínimo.
- [x] Se prioriza el artículo pendiente (sin conteo físico hoy).
- [x] Seleccionar un artículo abre el formulario de conteo con motivo predeterminado, sin escribir datos todavía.
- [x] Contar un artículo que permanece bajo mínimo conserva la alerta y lo marca como contado hoy.
- [x] Contar un artículo por encima del mínimo elimina la alerta; saldo y estado se actualizan.
- [x] Se mantiene el control de confirmación existente, validación de cantidades y verificación del saldo antes del RPC.
- [x] La navegación mediante hash `#review-low` resuelve en la pestaña de Registro rápido.
- [x] Se conservan entradas, salidas, lotes y recepción múltiple en modo normal.

## Validación manual pendiente
- [ ] Abrir desde KPI y prioridad de `admin.html` con sesión administrador.
- [ ] Verificar el listado real de alertas (57 en la captura anterior; puede cambiar).
- [ ] Registrar un conteo autorizado (sin usar movimientos de prueba sobre existencias físicas reales).
- [ ] Confirmar que **Conteo físico de hoy** refleja el registro y **Stock bajo** sólo cambia si el saldo deja de cumplir el mínimo.
- [ ] Confirmar que `#quick` vuelve al registro normal y muestra la recepción múltiple.
- [ ] Validar interfaz en móvil y escritorio y navegación por teclado.
- [ ] Verificar que perfiles sin permiso de administrador no acceden a conteos ni datos internos.

## Advertencias
- **Contado hoy** no significa **repuesto**; los artículos contados que siguen bajo mínimo se mantienen señalados.
- La cantidad introducida es el saldo físico total en la unidad configurada, **no** una entrada de compras.
- Un conteo solo se guarda después de mostrar saldo anterior y posterior y recibir confirmación del usuario.
- Las compras sugeridas no se generan ni ejecutan automáticamente.
- Si el resultado de una escritura es incierto, revisar el historial antes de reintentar.
