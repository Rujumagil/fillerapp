# Fiiller Café · Carruseles y microinteracciones v4

## Objetivo
Dar sensación de app profesional a la PWA pública, sin volver al menú interminable ni cambiar pedidos. Priorizar productos preparados; productos empaquetados como extras.

## Alcance
- **Inicio**: carrusel de hasta seis preparados destacados y carrusel de hasta cuatro complementos empaquetados.
- Flechas anterior/siguiente, contador visual `1 / N`, barra de progreso y deslizamiento táctil con `scroll-snap`. No hay autoplay.
- Banda compacta de cuatro beneficios, desplazable en celular, bajo el Hero.
- Animaciones ligeras: secciones que aparecen al entrar en pantalla, selección de categorías, imagen de producto al pasar el cursor y respuesta del contador del carrito cuando aumenta el número de productos.
- **Menú, búsqueda, categorías y favoritos**: conservan cuadrícula, límite de ocho artículos y botón «Ver más»; no se convierten en carruseles.
- Accesibilidad: botones de flecha con `aria-label`, `aria-controls` y `disabled` al llegar a los extremos; carruseles con `role=region`, nombre accesible y `tabindex=0`; navegación con flechas cuando el carrusel tiene el foco; `prefers-reduced-motion` elimina animaciones y desplazamiento suave.
- Mantiene el scroll del carrusel cuando el carrito actualiza el menú. El archivo de efectos reacciona al evento `fiiller:menu-rendered` y no crea nuevos flujos de compras.
- PWA: `filler-app-v89`, con `fiiller-motion.js` y `fiiller-motion.css` precacheados.

## Pruebas estáticas y simulaciones
- [x] Sintaxis JS y CSS correctas.
- [x] Sin IDs duplicados y con todos los JS/CSS de index.html precacheados.
- [x] Render simulado Inicio: 2 carruseles, 4 flechas y 10 tarjetas (6 preparados y 4 extras).
- [x] Render simulado Menú, Categoría, Favoritos y búsqueda: sin carruseles; menú paginado preservado.
- [x] Comportamiento simulado de flechas: al inicio desactiva «anterior»; clic derecho avanza una tarjeta y cambia contador; tecla izquierda retrocede; medidor de progreso se actualiza.
- [x] Control de accesibilidad: labels de flechas, atributo `aria-controls`, `scroll-snap`, teclado y respeto por movimiento reducido.
- [x] No se modificaron `FillerCloud.placeOrder`, precios, stock, extras ni datos de inventario.

## Verificación pendiente en la app real
- [ ] Revisar carruseles táctiles en Safari/iOS, Chrome/Android y escritorio.
- [ ] Confirmar que los controles están alineados y tienen tamaño táctil suficiente.
- [ ] Probar teclado y VoiceOver/TalkBack, incluido estado `disabled` de las flechas.
- [ ] Agregar artículo dentro de carrusel y verificar que conserva la posición tras actualizar el carrito.
- [ ] Verificar stock, productos retirados, extras, favoritos y flujo de compra sin registro.
- [ ] Revisar la PWA instalada y limpieza de caché al actualizar a v89.
- [ ] Realizar un pedido de prueba autorizado y comprobar el estado en cocina.
- [ ] Medir CLS/LCP y conversión tras publicación, sin prometer incremento de ventas antes de obtener datos.
