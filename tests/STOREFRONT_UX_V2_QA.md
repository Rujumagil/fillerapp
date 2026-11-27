# Fiiller Café · Refactor UX PWA (27 nov 2026)

## Alcance de la actualización
- `index.html` semántico y simplificado; los estilos y el motor de catálogo originales se extrajeron a `fiiller-base.css` y `fiiller-catalog-core.js`, manteniendo sus contratos globales con extras, fotos y nube.
- Drawer responsive: panel lateral en escritorio y bottom-sheet en móvil, oculto fuera del flujo principal hasta que el usuario pulse Pedido/Ver pedido. Scroll bloqueado con backdrop, `inert`, foco inicial/restauración, Escape y retroceso del navegador.
- Carrito vacío sin formulario ni total $0. Acción «Explorar el menú», que cierra el drawer.
- Hero con un CTA principal. Instalación PWA en aviso discreto inferior, no invasivo. Insignia con alto contraste.
- Menú inmediatamente tras el Hero: búsqueda global, pestañas Café/Sándwiches/Panadería (solo si existe disponibilidad real), cuadrícula de fotos 1:1 y descripción breve sin datos inventados, precio real y acción por producto. Los artículos con variaciones/extras conservan su selector.
- Ofertas y «Próximos»: ocultos por defecto; oferta visible solo si está publicada, tiene SKU vigente en stock y precio del catálogo. El CTA usa el flujo normal de extras. «Próximos» requiere imagen publicada; no hay tarjetas genéricas.
- Horarios 15/20/30 minutos: se traducen a hora local de Guadalajara y se ofrecen solo antes de las 16:00, con recogida hasta 16:30; selector manual y programación de mañana continúan disponibles. Se invalida una hora con menos de 10 minutos de anticipación, sin sustituirla silenciosamente.
- Invitados: nombre/teléfono se guardan en `localStorage` **solo después de que Supabase confirme el pedido** y se precargan hasta por 90 días en el mismo navegador; botón «Olvidar mis datos».
- Skeletons de catálogo/avisos/conexión, y estado de cocina exclusivamente dentro del drawer. Se impide afirmar disponibilidad de pedidos mientras no haya catálogo sincronizado.
- Service worker `filler-app-v86` incluye todos los nuevos archivos para que la PWA invalide el shell anterior. **Pedidos requieren conexión real.**

## Pruebas verificadas sin escrituras de producción
- [x] Sintaxis válida del motor core, drawer, accesos rápidos, nube, promociones, personalización, menú, disponibilidad y service worker.
- [x] CSS balanceado y HTML sin duplicados en `id`; no quedan scripts ni estilos grandes incrustados en `index.html`.
- [x] Todas las dependencias JS/CSS de la página están incluidas en la precaché.
- [x] Simulación: drawer abre/cierra, `aria-modal`, `aria-hidden`, `inert`, foco restaurado y «Explorar» desplaza al menú.
- [x] Simulación: 09:00 ofrece recogida a las 09:15, 09:20 y 09:30; a las 09:03 conserva 09:15; a las 09:06 la invalida si faltan menos de 10 minutos; después de las 16:00 no ofrece nuevos horarios hoy, pero sí mañana.
- [x] Simulación: promoción publicada válida muestra $29, pero al agotarse oculta tarjeta y enlace; las novedades sin imagen no se muestran.
- [x] No se cambió el RPC `FillerCloud.placeOrder`, ni precios, inventario o permisos.

## Pruebas manuales necesarias antes de considerar validación end-to-end completa
- [ ] En GitHub Pages comprobar UI visual de iPhone/Safari, Android/Chrome y escritorio con el service worker v86.
- [ ] Verificar drawer en ambos tamaños: scroll, backdrop, cierre/retroceso, Escape, navegación Tab y VoiceOver/TalkBack.
- [ ] Verificar búsqueda, pestañas, fotos y extras con los artículos vigentes en Supabase.
- [ ] Verificar precio y stock de cada oferta activa; remover del panel administrativo campañas obsoletas si existen.
- [ ] Validar 15/20/30 minutos, último minuto de atención, recolección mañana y error de horario caducado en cocina/Supabase.
- [ ] Con autorización administrativa, hacer un pedido real controlado desde invitado y comprobar cocina, seguimiento y notificación, sin duplicar cobro ni crear pedidos de prueba no autorizados.
- [ ] Comprobar que nombre/teléfono se precargan en una visita posterior y que «Olvidar mis datos» los borra.
- [ ] Probar sin conexión: no permitir confirmación ni presentar el catálogo local como stock real.
- [ ] Revisar WCAG AA con Lighthouse/axe en pantalla publicada, incluida navegación por teclado.
- [ ] Revisar analítica real de conversiones en una fase separada; no se afirma aumento de ventas solo por el diseño.

## Referencias
- Punto de entrada: `index.html`
- Estilo base: `fiiller-base.css`
- Diseño responsive: `fiiller-ux-v2.css`
- Catálogo y horario: `fiiller-catalog-core.js`
- Drawer: `fiiller-drawer.js`
- Chips rápidos: `fiiller-ux-v2.js`
- Filtrado y personalización: `extras-storefront.js`
- Nube y guest checkout: `storefront-cloud.js`
- Promociones: `storefront-features.js`
- Caché PWA: `sw.js`
