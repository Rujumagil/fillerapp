# Filler Café — transición a pedidos en la nube

## Auditoría del repositorio (13 octubre 2026)
Confirmados en main: index.html, admin.html, pedidos.html, monitor.html, menu-control.html, pwa.js, sw.js, manifest.json. Los archivos HTML contienen scripts inline que leen/escriben fillerOrders y fillerMenu desde localStorage. El cliente descuenta existencia en navegador y muestra promesa de aviso por teléfono sin un servicio real de mensajería. El service worker guarda shell en caché y muestra notificaciones locales, pero no implementa eventos push entrantes.

## Decisión arquitectónica
Conservar GitHub Pages y todos los estilos/pantallas. Crear proyecto Supabase **dedicado** para pedidos y productos; jamás reutilizar sin autorización compas-one o aula-compas. Aplicar `supabase/schema.sql` como base inicial solo tras validar el diseño y elegir un proyecto. Configurar Auth para cocina/admin, RLS, Storage para fotos y Edge Function transaccional para ingresar pedidos con precio y stock verificados en servidor.

## Pendientes antes de pasar a producción
1. Crear/seleccionar proyecto Supabase Filler dedicado y guardar URL pública + publishable key (nunca secret/service_role en GitHub Pages).
2. Registrar usuarios internos de cocina y administración; asignar roles por vía administrativa segura.
3. Implementar endpoint seguro de pedido, atómico y con control anti-abuso; devolver identificador y token privado de seguimiento.
4. Sustituir los puntos de lectura/escritura de localStorage en index, pedidos, monitor y menu-control por un módulo de datos; gestionar fallos sin afirmar que se recibió un pedido.
5. Importar catálogo existente de forma revisada y conservar un respaldo de datos locales del navegador anterior a la migración.
6. Implementar almacenamiento de fotos con límites de archivos y políticas de acceso.
7. Añadir actualización en tiempo real para cocina y monitor con acceso interno autenticado.
8. Implementar notificaciones Web Push reales (VAPID, suscripciones y función de envío del lado del servidor), con alternativa de consulta de estado visible para el cliente.
9. Proteger admin.html, pedidos.html, monitor.html y menu-control.html por autenticación y autorización: la URL no es control de acceso.
10. Probar extremo a extremo en 2 navegadores distintos y luego desplegar a main.

## Estados
Nuevo (amarillo), Preparando (azul), Listo (verde), Entregado (cerrado). Fuera de tiempo es una alerta derivada: más de 10 minutos desde creación sin estar Listo o más de 10 minutos desde Listo sin Entregado. No sobreescribir con «Fuera de tiempo» el estado de trabajo.

## Importante
Esta rama solo prepara el esquema y la ruta de migración; **no** activa una base de datos ni envía notificaciones reales. La rama main y la web pública no cambian.
