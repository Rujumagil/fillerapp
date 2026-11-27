# Fiiller Café · Experiencia de compra profesional v1

## Objetivo
Reducir pasos para encontrar, elegir y recoger un pedido, manteniendo intactos la recepción segura de pedidos, los precios, existencias, horarios y extras establecidos por los módulos actuales.

## Cambios
- El menú y carrito pasan delante de los bloques de Promos y Próximos. Los enlaces de navegación a las campañas se mantienen.
- Nuevo acceso visible de búsqueda por nombre desde el inicio de la compra. Se conecta al mismo `filler-product-search` de `extras-storefront.js`.
- Categorías rápidas se generan solamente para categorías con productos disponibles en el catálogo cargado.
- La búsqueda en todas las categorías no queda restringida a una familia seleccionada anteriormente.
- En el carrito vacío se ocultan datos del cliente y horario, y se invita a elegir productos. La personalización y el checkout oficial se conservan.
- Dos sugerencias contextuales de complemento (bebida para alimentos o alimento para bebida) usando exclusivamente artículos disponibles, precio oficial y `addToCart` existente. Sin combinaciones ni descuentos inventados.
- Los anuncios públicos solo se cargan si `is_published=true`; los artículos no publicados ya no aparecen como promociones.

## Verificado con simulaciones locales, sin modificar Supabase
- [x] JavaScript sin errores de sintaxis.
- [x] Las categorías reflejan familias con productos existentes y stock positivo.
- [x] El complemento no repite productos en el carrito y descarta chilaquiles, tortas y artículos no disponibles de las sugerencias.
- [x] El botón de complemento invoca la función de agregar existente (puede abrir el modal de extras).
- [x] El buscador responde al texto y la categoría seleccionada.
- [x] La estructura conserva menú, carrito, botones de pedido, avisos, favoritos y las importaciones del flujo de compra.

## Pruebas manuales pendientes en la app publicada
- [ ] Abrir en escritorio y celular: ver buscador y menú antes de promos.
- [ ] Buscar un artículo por parte del nombre y con acentos, desde cualquier categoría.
- [ ] Seleccionar café con tamaño y extra de leche; validar precio en el carrito.
- [ ] Añadir platillo y comprobar sugerencia de bebida con precio real y disponibilidad actual.
- [ ] Confirmar el comportamiento de carrito vacío, carrito con artículos y borrador de pedido anterior.
- [ ] Simular ausencia de conectividad: no permitir confirmación de pedidos y no mostrar complementos sin sincronización.
- [ ] Validar recepción real solo con permiso del equipo, evitando pedidos de prueba sobre producción.
- [ ] Revisar campañas publicadas y retirar anuncios de productos que ya no se venden, tanto de Promos como de notificaciones.
- [ ] Comprobar navegación con teclado, lector de pantalla y tamaños menores de 380px.

## Límites y siguientes etapas
- Esta entrega **no implementa analítica de conversiones** ni permite atribuir aumentos de ventas sin medir sesiones, carritos y pedidos confirmados.
- Los artículos y precios siguen provenientes del catálogo oficial. No se inventan promociones ni descuentos.
- El checkout sin registro, seguimiento de pedidos, notificaciones, favoritos y la PWA conservan sus módulos actuales. Su funcionamiento end-to-end requiere prueba real.
- El catálogo y las promociones deben validarse contra las reglas comerciales vigentes para evitar mostrar campañas caducadas.
