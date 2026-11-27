# Mi Fiiller V2 — Auditoría de implementación (27 noviembre 2026)

## Objetivo
Convertir el perfil del cliente en una experiencia mobile-first de cuatro vistas sin cambiar la base Supabase, RLS, el flujo de pedidos ni las preferencias existentes.

## Estructura y mejoras
- **Inicio:** bienvenida reducida, botón de pedido, último pedido, favoritos y acceso directo a Mi cuenta.
- **Pedidos:** historial de 90 días, tarjetas compactas con estado, fecha, productos, total, seguimiento y «Volver a pedir»; vinculación de pedido invitado dentro de un bloque desplegable.
- **Favoritos:** miniaturas de `filler_products.image_url`, precio vigente, disponibilidad, agregar y quitar de la cuenta, siempre filtrados por usuario autenticado.
- **Mi cuenta:** datos, preferencias comerciales, encuesta y configuración de instalación/notificaciones; recompensas no activas ocultas.
- Navegación inferior en móvil y navegación horizontal en escritorio, ambas con `aria-current`, teclado y `prefers-reduced-motion`.
- Mensajería sigue operativa y se presenta más compacta al entrar como cliente.

## Correcciones funcionales
1. `fiiller-order-actions.js` espera el evento `fiiller:member-ready` y consulta `FillerCustomerAuth.getSession()`, en vez de leer una sesión local incompleta antes de que termine la validación. Solo muestra acciones si hay pedidos activos; los pedidos finalizados no muestran gestión innecesaria.
2. `mi-filler.js` verifica el catálogo publicado, existencia y retirados antes de «Volver a pedir». Si algunos artículos no están disponibles, se excluyen y el usuario debe aceptar los cambios; si ninguno está vigente, no se prepara carrito.
3. `storefront-cloud.js` vuelve a aplicar `fiillerMenuPermitido()` al restaurar cualquier borrador de carrito, como defensa adicional. La app oficial aún valida existencias, precios y extras al agregar.
4. La tarjeta «Mi último pedido» enlaza al historial aunque no exista aún un token válido de seguimiento.
5. Estado visual tras cerrar sesión: se ocultan vistas privadas y se limpian las acciones pendientes.

## Verificaciones realizadas sin alterar producción
- [x] JavaScript válido en `mi-filler.js`, `mi-fiiller-v2.js`, `fiiller-order-actions.js`, `storefront-cloud.js` y `sw.js`.
- [x] HTML: secciones, formularios, contenedores y navegación balanceados; IDs únicos; cuatro pantallas.
- [x] CSS balanceado; assets en shell PWA `filler-app-v91`.
- [x] Simulación de vistas: al abrir Favoritos o Mi cuenta se ocultan las demás y se actualiza el ancla.
- [x] Simulación de volver a pedir: chilaquiles retirados omitidos; los disponibles se mantienen, stock limitado y confirmación antes de continuar.
- [x] No se cambiaron funciones de cobro, control de cocina, stock, permisos RLS ni operaciones RPC.

## Pendiente de validar en navegador real
- [ ] Smartphone Android y iPhone: barra inferior, espacios seguros, teclado virtual y navegación sin saltos.
- [ ] Cliente autenticado: cambiar entre vistas y comprobar sesión, edición de datos, favoritos y mensajes.
- [ ] Prueba específica del error «Inicia sesión» pese a una cuenta activa, tanto al cargar como al volver a la pestaña.
- [ ] Histórico: seguimiento y repetición de productos vigentes; rechazo de artículos descatalogados.
- [ ] Vincular compra de invitado desde enlace privado y número de teléfono.
- [ ] Instalación PWA, push y preferencia comercial sin solicitar autorizaciones imprevistas.
- [ ] Lighthouse/axe y pedido end-to-end **solo con autorización para crear una orden de prueba**.
- [ ] Confirmar que la URL publicada sirve la caché v91 actualizada; no se afirma despliegue externo sin comprobación.

## Archivos
- `mi-filler.html`
- `mi-filler.js`
- `mi-fiiller-v2.css`, `mi-fiiller-v2.js`
- `fiiller-order-actions.js`
- `storefront-cloud.js`
- `sw.js`
