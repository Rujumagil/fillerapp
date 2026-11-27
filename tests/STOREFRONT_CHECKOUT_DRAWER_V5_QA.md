# Fiiller Café · Correcciones del drawer de pedido V5

## Motivo
Revisión de capturas del carrito con dos productos: Almendra natural 35 g ($18), Chocorroles Marinela 80 g ($25), total $43. Se observaban nombre/precio juntos, total duplicado (tarjeta y barra inferior), campos poco compactos y apertura del drawer desde una posición de scroll anterior.

## Implementación
- `extras-storefront.js`: renglones del carrito con nombre, precio unitario y cantidad separados. Botones +/- con nombres accesibles. No cambia cálculo de subtotales, validación de stock ni registro de pedidos.
- `fiiller-checkout-v5.css`: presentación con tarjetas compactas, jerarquía visual de datos, controles y espaciados; **único total visible en la barra fija** de «Confirmar pedido»; campos de invitado en dos columnas solo cuando hay ancho suficiente; sugerencias compactas. Respeta campos y validaciones originales.
- `fiiller-drawer.js`: al abrir, resetea el scroll al inicio del panel. El foco sigue restaurándose al cerrar, como en v2.
- `fiiller-conversion.js`: no propone dos tamaños del mismo café simultáneamente; busca hasta dos sugerencias de familias distintas, evitando repetición.
- `sw.js`: cache v90, incluye stylesheet nuevo.

## Pruebas estáticas/simuladas
- [x] Render de dos filas: Almendra $18 + Chocorroles $25 = $43 en ambos nodos que actualiza el motor, con 4 botones de cantidad accesibles.
- [x] Precio y nombre en nodos distintos; el total intermedio se oculta mediante CSS y el cálculo sigue intacto.
- [x] Sintaxis JavaScript válida en render, sugerencias, drawer y SW.
- [x] HTML sin ids repetidos; todos los recursos de scripts/estilos incluidos en precache.
- [x] CSS balanceado y caché v90.
- [x] Sugerencias: con dos empaquetados, café y cuernito (familias diferentes). Con cuernito, café y bebida embotellada como extra.
- [x] Drawer abre desde scroll superior para evitar formularios cortados.

## Pendiente en dispositivos reales
- [ ] Safari iPhone y Chrome Android: el drawer abre al inicio, respeta encabezado sticky y teclado virtual.
- [ ] Validar tamaños 320–700px: nombre largo, cantidad, horarios y barra inferior sin colisiones.
- [ ] Verificar una compra de prueba autorizada: carrito, extras, stock, total, horario y recepción en cocina, sin doble pedido.
- [ ] Comprobar que confirmación/error y campos autocargados son visibles al utilizar el teclado móvil.
