# Fiiller Café · App-like storefront / sprint visual (27 nov 2026)

## Objetivo
Convertir la página pública de pedidos de un catálogo extenso a una experiencia móvil de app que se pueda explorar sin scroll interminable. Priorizar productos preparados; bebidas y botanas empaquetadas como complementos opcionales. **No tocar la operativa de pedidos**.

## Cambios incluidos
- Hero reducido en altura, fotografía de vitrina oficial conservada, buscador destacado y una sola CTA.
- Categorías con iconos, carrusel horizontal táctil y foco visible. Selección por categoría sin cambiar de página.
- Vistas de navegación: **Inicio** (hasta 6 preparados + 4 complementos), **Menú** (8 preparados por página), **Categoría** (hasta 8 productos + «Ver más»), **Favoritos** (solo IDs de favoritos obtenidos de la cuenta del cliente), y **Pedido** (drawer existente).
- Tarjetas con imagen 1:1 para preparados, textos compactos, etiquetas de disponibilidad, botón de compra y soporte para productos configurables (tamaños, extras, SKUs).
- Complementos en bloque visualmente secundario, con desplazamiento horizontal en móvil.
- Animaciones de entrada discretas y microinteracciones; `prefers-reduced-motion` las desactiva.
- Navegación inferior móvil Inicio / Menú / Favoritos / Pedido; contador del carrito se mantiene enlazado al render existente.
- Se trasladó la clasificación de galletas industriales (Oreo, Príncipe, Chocorroles) a complementos por familia comercial, con excepción explícita de repostería casera.
- Caché PWA `filler-app-v88` incluye todos los módulos y CSS.

## Pruebas locales sin modificar Supabase
- [x] JavaScript válido en módulos modificados y dependientes.
- [x] CSS balanceado; no hay IDs duplicados.
- [x] Todas las referencias JS/CSS de `index.html` están en el APP_SHELL de `sw.js`.
- [x] Orden de scripts: core → navegación tipo app → catálogo con extras → favoritos → búsqueda.
- [x] Renderización simulada: Inicio presenta 6 preparados + 4 complementos; Menú presenta 8 y «Ver más»; siguiente página permite 16.
- [x] Renderización simulada: Categoría limita a 8 y muestra «Ver más»; Favoritos muestra solo los IDs guardados; búsqueda filtra por texto.
- [x] Galletas industriales se tratan como retail; repostería casera como preparada.
- [x] Se conserva `FillerCloud.placeOrder`, el drawer de pedido y el control de disponibilidad del catálogo oficial.

## Validación manual pendiente en la web publicada
- [ ] Revisar iPhone/Safari, Android/Chrome, tablet y escritorio, incluida la vitrina del Hero.
- [ ] Navegar Inicio / Menú / categoría / Favoritos / Pedido con mouse, teclado y lector de pantalla.
- [ ] Probar «Ver más» en una familia con 9+ productos y la búsqueda desde otra categoría.
- [ ] Confirmar que el backend filtra stock y categorías discontinuadas antes de elegir.
- [ ] Validar modal de tamaños/extras, favoritos autenticados y carrito sin registro.
- [ ] Confirmar recepción de pedido en cocina mediante una prueba autorizada.
- [ ] Ejecutar Lighthouse / axe para WCAG AA, CLS/LCP y consumo de datos móviles.
- [ ] Medir en una fase posterior la tasa de agregar al carrito y pedidos confirmados; no asumir aumento de ventas por diseño.

## Archivos
- `index.html` — navegación y encabezados
- `fiiller-app-experience.js` — máquina sencilla de vistas / paginación / navegación
- `fiiller-app-experience.css` — nueva capa mobile-first
- `extras-storefront.js` — selección de 6/4 y paginación sin modificar `addToCart`
- `fiiller-conversion.js` — chips con iconos, navegación por categorías y búsqueda
- `filler-favorites-menu.js` — acceso de solo lectura a IDs autenticados para la vista favorita
- `fiiller-menu-priority.js` — clasificación visual preparado/retail
- `sw.js` — cache v88
