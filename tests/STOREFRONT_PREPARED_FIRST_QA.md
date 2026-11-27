# Fiiller Café · Productos preparados primero (27 nov 2026)

## Objetivo comercial
Mostrar primero desayunos, cafés, sándwiches y alimentos preparados de Fiiller Café, dejando bebidas embotelladas y botanas empaquetadas como **complementos opcionales** y no como productos protagonistas.

## Arquitectura
- `fiiller-menu-priority.js`: orden y clasificación de **presentación comercial**, separados de catálogo TPV/almacén. Categorías de retail reconocidas: `Bebidas embotelladas`, `Botanas y dulces` y denominaciones equivalentes de productos empaquetados.
- `fiiller-catalog-core.js`: filtros de preparados primero; los complementos se separan al final con una etiqueta clara. Se excluyen categorías donde todos los artículos estén comercialmente retirados.
- `extras-storefront.js`: orden visual principal: preparados destacados disponibles → familias preparadas por prioridad → complementos en una única sección final.
- La sección complementaria muestra inicialmente **seis artículos disponibles**, alternando bebidas y botanas si ambas familias existen. `Ver todos los complementos` permite ampliarla sin salir de la página; buscar o filtrar sigue mostrando todos los artículos.
- `fiiller-conversion.js`: categorías rápidas encabezadas por opciones preparadas. En el carrito, si hay un preparado, se propone primero otro preparado compatible (por ejemplo un café) y después un empaquetado opcional. Si hay solo retail, se recomiendan preparados.
- `fiiller-ux-v2.css`: preparados con jerarquía visual principal y extras en un bloque secundario.
- `sw.js`: caché v87, con el nuevo archivo de prioridad incluido.

## Validaciones automáticas/simuladas
- [x] Clasifica Café, Sándwiches y Panadería como preparados, y agua embotellada/botanas como complementos.
- [x] Filtros del catálogo presentan preparados antes de las dos familias empaquetadas.
- [x] Las ofertas destacadas de preparados nunca incluyen un empaquetado ni artículos agotados.
- [x] En el menú «Todos» el bloque de complementos queda después de todas las familias de preparados.
- [x] Con ocho artículos empaquetados disponibles, se muestran seis alternando bebidas y botanas y aparece «Ver todos los complementos (8)».
- [x] En la venta sugerida de un sándwich se recomienda un café preparado antes del agua embotellada; con solo agua, se sugieren preparados.
- [x] JavaScript sintácticamente válido, CSS balanceado, archivo priorizado cargado antes del catálogo y caché v87 precacheada.

## Pruebas con la app publicada — pendientes
- [ ] Comprobar jerarquía real en teléfono y escritorio, con inventario sincronizado.
- [ ] Confirmar nombres de las familias del catálogo oficial. Los artículos empaquetados mal clasificados en una familia de preparados deben corregirse en el origen o recibir metadatos explícitos en una fase posterior.
- [ ] Confirmar búsqueda y filtros: al seleccionar Bebidas embotelladas o Botanas y dulces se puede ver la familia completa.
- [ ] Validar expandir/contraer complementos y que el foco de teclado continúe siendo usable.
- [ ] Añadir preparado y después empaquetado: validar tamaño, extras, existencias y precio del carrito con los datos de Supabase.
- [ ] Confirmar que el botón «Ver pedido» y el checkout oficial no cambian y que el carrito guarda únicamente artículos autorizados.
- [ ] Revisar la presentación de productos preparados sin foto para priorizar sus imágenes reales.

## Restricciones
**Sin cambios de precios, recetas, stock, compras, pagos, promociones o reglas de recepción de pedidos.**
Esta separación es de **merchandising visual**, no una reasignación contable de ventas TPV ni de consumo de inventario. No se afirma que las ventas aumentaron sin medición de conversión.
