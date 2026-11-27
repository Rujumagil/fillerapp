# Fiiller Café · QA del resumen ejecutivo de Control Fiiller

## Fuentes y separación de métricas
- **Ventas de hoy:** `ocs_filler_sales_days` para la fecha local America/Mexico_City. No sumar importes de pedidos digitales. Si no existe registro del corte, mostrar **Sin corte**, no $0.
- **Pedidos digitales activos:** conteo exacto PostgREST de `filler_orders` con estados Nuevo, Preparando o Listo. No inferir el conteo de una lista parcial.
- **Avisos de mensajes:** espejo del estado de `fiiller-support-alerts.js` en esta pestaña; no presentarlo como número global de chats sin responder.
- **Stock bajo:** `filler_inventory_items`, con mínimo positivo y saldo menor o igual al mínimo. Son datos de almacén todavía sujetos a conciliación física.

## Verificación automática en ambiente simulado
- [x] Sintaxis JavaScript de layout, KPIs y script inline.
- [x] Caso administrador: venta $3,172, cuatro pedidos activos y un artículo bajo mínimo, leídos desde respuestas simuladas de fuentes individuales.
- [x] Caso sin corte: devuelve «Sin corte», no $0.
- [x] Caso cocina: consulta pedidos y restringe ventas e inventario; no solicita esas tablas.
- [x] Scripts de cancelaciones, alertas, push y acceso se conservan en la página.
- [x] Layout se ejecuta antes que las funciones de cancelaciones y avisos.

## Verificación manual pendiente en producción
- [ ] Abrir admin.html con sesión admin y validar los cuatro indicadores frente al dashboard y almacén existentes.
- [ ] Comprobar ausencia de corte en una fecha sin registro.
- [ ] Verificar contador de pedidos con estados Nuevo, Preparando y Listo.
- [ ] Comprobar aviso de mensaje entrante y activar sonido/push únicamente tras interacción del usuario.
- [ ] Revisar una cancelación pendiente (sin aprobar/rechazar solo para probar).
- [ ] Confirmar traslado del control de instalación de la PWA y cierre de sesión.
- [ ] Abrir con perfil cocina y sin sesión para verificar los estados restringidos.
- [ ] Revisar diseño de escritorio, tableta y móvil.
- [ ] Verificar funcionamiento de todos los enlaces principales.
- [ ] Probar la actualización cuando vuelve la conectividad.

## Notas de seguridad y honestidad de datos
- El dashboard ejecutivo es de solo lectura, no cambia inventario, pedidos, cancelaciones ni ventas.
- No muestra una cifra cuando una fuente falla. Cada indicador administra su propio estado.
- Un resumen visible en la página no sustituye la autorización de cada endpoint.
- Los mensajes solo registran eventos observados por la pestaña actual.
