# QA · Registro rápido de inventario Fiiller Café

## Objetivo
Reducir el tiempo de búsqueda y captura sin duplicar productos ni aplicar ajustes implícitos. Estas comprobaciones son **manuales** y requieren sesión de administrador y base de datos de prueba o insumos autorizados; no ejecutarlas con existencias reales solo para probar.

## Escenarios
- [ ] Usuario sin sesión o rol distinto de admin no puede consultar ni guardar datos del almacén.
- [ ] Se abre **Registro rápido** desde el menú lateral y el botón superior.
- [ ] Se encuentra un insumo por nombre, nombre sin acentos, código OCS y código de barras ya vinculado.
- [ ] Se filtra por familia y se muestra el saldo junto con la unidad del insumo.
- [ ] Un lector USB/Bluetooth envía el código con Enter y selecciona el artículo correcto.
- [ ] Escáner con cámara: identifica el código en la pantalla de códigos y el botón «Registrar entrada o salida» abre el producto correcto en Registro rápido.
- [ ] Código de barras **desconocido** no hereda el artículo escaneado previamente.
- [ ] Entrada de 2 unidades suma exactamente 2 a la existencia.
- [ ] Salida de 1 unidad resta exactamente 1 y se bloquea cuando supera el saldo disponible.
- [ ] Conteo físico de 0 establece 0 como existencia final; no se interpreta como salida ni se suma.
- [ ] No es posible guardar sin motivo/folio; se solicita confirmación mostrando saldo anterior y posterior.
- [ ] Un envío idéntico repetido dentro de 30 segundos se advierte y no vuelve a guardarse desde la misma pestaña (esto **no** sustituye idempotencia del servidor).
- [ ] Si el saldo cambia en otra sesión antes del envío, se obliga a revisar el saldo actualizado.
- [ ] Intento de crear un SKU o nombre ya existente se bloquea en interfaz; probar también la protección de duplicados en servidor.
- [ ] Registrar lote no incrementa automáticamente existencias.
- [ ] Historial, conteos, caducidades y tabla general siguen funcionando.
- [ ] Confirmar visualización responsive en móvil y escritorio.

## Limitaciones controladas
- El consumo automático por recetas/ventas continúa **deshabilitado** mientras no se validen equivalencias de insumos.
- La presentación de compra (caja, bolsa, botella) debe expresarse en la unidad base configurada; no se realiza conversión automática.
- La pantalla usa los RPC `filler_inventory_move` y `filler_inventory_count` existentes. Confirmar en ambiente de pruebas que el servidor rechace saldos negativos, escrituras sin autorización y repetición concurrente.
- No se cambiaron datos físicos de almacén ni se realizó migración de base de datos desde este PR.
