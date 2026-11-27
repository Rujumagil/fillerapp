# Mi Fiiller V2.1 — Revisión UX móvil y validaciones de disponibilidad

Fecha: 27 noviembre 2026

## Contexto
La vista publicada en `https://fiillercafe.app/mi-filler.html` está accesible mediante la pestaña conectada del navegador. Contiene la navegación Inicio, Pedidos, Favoritos y Mi cuenta. Esta comprobación es de contenido; **no equivale a una captura de pantalla ni a pruebas táctiles de un dispositivo físico**.

## Mejoras incorporadas
- Historial: cinco pedidos iniciales, botón «Ver más pedidos» y «Mostrar menos» para evitar scroll continuo.
- Recompra: consulta paralela e independiente del catálogo vigente; si todos los productos de una orden están retirados o sin stock, sustituye «Volver a pedir» por «Productos no disponibles · Ver menú». Si falla el catálogo, conserva el historial y ofrece «Comprobar disponibilidad», que valida antes de añadir.
- Unificación de criterio de disponibilidad en favoritos y recompra: no se presentan como comprables chilaquiles retirados, tortas descontinuadas, hot cakes, productos desactivados o agotados; se mantiene el filtrado adicional al reconstruir el carrito.
- Fechas de recolección formateadas de manera legible; el dato original de pedido no se modifica.
- Inicio con menos encabezados duplicados tras iniciar sesión.
- Favoritos como carrusel táctil horizontal con scroll-snap en pantallas estrechas y tarjetas legibles.
- Controles táctiles (botones de al menos 44 px donde corresponde), foco visible y barra de navegación inferior oculta cuando el teclado se utiliza en un campo editable.
- Contraste del texto oscuro sobre naranja de marca en estado normal y hover: aproximadamente 5.68:1 y 4.65:1, respectivamente; mínimo AA de texto normal = 4.5:1.
- Cache de PWA `filler-app-v92` para propagar los cambios.

## Comprobaciones
- [x] Scripts JavaScript con sintaxis válida y estructura HTML balanceada.
- [x] No se introdujeron IDs duplicados ni referencias a archivos ausentes de la precache de PWA.
- [x] Filtro comercial probado por simulación con 7 situaciones: retirados, hot cakes, stock 0, activo false y productos comercializables.
- [x] Enlaces `#menu`, `#pedido` y `#comprar-rapido` existentes en `index.html`.
- [x] Actualización de contador y navegación por pestañas existentes se conservan.

## Pendientes de validación manual
- [ ] Chrome Android a 320/360/390/412 px, barra inferior y controles con teclado visible.
- [ ] Safari iPhone, área segura, scroll horizontal y carrusel de favoritos.
- [ ] Cuenta sin pedidos, con 1 pedido y con más de 5 pedidos.
- [ ] Repetir pedido con precios/stock modificados: confirmar cálculo real en el carrito y recepción en cocina sin registrar una orden no autorizada.
- [ ] Edición de perfil, vinculación de invitado, notificaciones, permisos y cierre de sesión.
- [ ] Conexión real de Supabase, permisos y experiencia con redes lentas; no se hicieron transacciones reales.

Las actualizaciones están limitadas a presentación y comprobación de disponibilidad; sin cambios en cobros, inventario, precios ni esquema de datos.
