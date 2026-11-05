# Fiiller Café — Conciliación diaria Arrow / tickets / recetas / almacén

Estado: diseño propuesto. **No activar movimientos de almacén hasta validar un archivo de muestra, el mapeo de artículos y controles de duplicación.**

## Fuente de verdad propuesta
Archivo exportado del TPV Arrow con detalle por folio y línea de producto. El conteo manual de tickets (`filler_arrow_ticket_counts`) y los importes agregados (`ocs_filler_sales_days`) son controles de conciliación, **no evidencia suficiente** para deducir consumos por receta.

La vista mensual `fiiller_tpv_product_monthly` muestra totales netos por producto; sirve para un estimado por periodo, pero NO ofrece trazabilidad completa por ticket si no se dispone del archivo de detalle.

## Datos mínimos por línea del archivo
- Fecha del corte, folio de ticket, código/nombre de producto Arrow, cantidad, importe de línea.
- Estado del comprobante (venta, cancelación, devolución), o documento adicional para conciliación de reversos.
- Identificador único de línea/documento y método/estado de pago cuando el archivo lo incluya.
- Para modificadores: variante/extras/preparación como líneas o campos que permitan identificar consumo; si no se conocen, bloquear salida automática.

## Condiciones de procesamiento
1. Lectura de archivo y normalización en entorno aislado.
2. Control por fecha, identificador del archivo y folio/línea. Reimportar un archivo idéntico NO debe duplicar movimientos.
3. Comparar tickets únicos y total neto contra el corte de venta (respetar descuentos/impuestos/redondeo que publique Arrow).
4. Separar alimentos preparados de productos retail cerrados; retail no usa receta, pero puede requerir salida unitaria propia con SKU.
5. Mapear explícitamente código de producto/variante de Arrow hacia REC-001/REC-002/REC-003. Si hay correspondencia ambigua, marcar pendiente para revisión, no inferir por coincidencia parcial del nombre.
6. Calcular las cantidades OCS por receta, agregando por código y conservando precisión. Salsa, crema y aceite tienen unidad de inventario "pieza" con fracciones equivalentes.
7. Conciliar devoluciones/cancelaciones y diferencias entre totales antes de autorizar descuento.
8. Emitir vista previa: ventas/tickets reconocidos, recetas, insumos, diferencias, errores, consumo teórico.
9. Solo con revisión de responsable y transacción auditada, ejecutar movimientos idempotentes del almacén. Todavía no está implementado.
10. No considerar pedidos de la app como pagos por el solo estado de preparación; la conciliación Arrow exige vínculo inequívoco para evitar doble conteo.

## Preguntas a resolver con un archivo real
- ¿El archivo contiene filas de producto por ticket o solo resumen diario?
- ¿Incluye folios únicos por caja, fecha y sucursal?
- ¿Los importes son netos o brutos? ¿Cómo registra devoluciones?
- ¿Los extras y variantes aparecen identificados?
- ¿Los pedidos de Fiiller pagados en Arrow llevan referencia que permita su conciliación?

## Seguridad actual
No conectar el archivo directamente a `filler_inventory_movements`, no instalar disparadores de descuento y no modificar saldos reales. Conservar `inventory_deduction_status=pending_integration` en las recetas.
