# Fiiller Café — separación segura de autenticación (27/oct/2026)

## Situación comprobada
- Mi Fiiller usa `qwxydjotwhniahaovrff.supabase.co` (proyecto llamado `compas-one`).
- Hay 4 filas en `public.filler_customers`, 2 cuentas de personal en `public.filler_staff`, 11 pedidos en `public.filler_orders` (valores observados, cambiarán con el uso).
- Hay relaciones a `auth.users` en filler_customers, filler_staff, filler_campaigns, filler_push_subscriptions, filler_order_messages y filler_customer_password_resets.
- El correo de confirmación inicial lo envía Supabase Auth con su plantilla a nivel **proyecto**. Cambiarla allí afectaría los otros sitios que comparten el mismo proyecto.
- Resend tiene el dominio `fiillercafe.app` verificado; la recepción `hola@fiillercafe.app` funciona con Cloudflare Email Routing.
- Ya existe `filler-welcome-email` para una bienvenida posterior a confirmación; no sustituye el correo de confirmación.

## Orden recomendado
1. Crear **nuevo proyecto Supabase dedicado** después de verificar costo, región y organización con el propietario. No mover el dominio, pedidos ni base pública hasta completar pruebas.
2. Configurar Auth (Site URL `https://fiillercafe.app`, Redirect URL `https://fiillercafe.app/mi-filler.html`, y URL de GitHub Pages solo si se mantiene).
3. Configurar el envío de Auth por SMTP transaccional o Send Email Hook **en el nuevo proyecto**. Branding Fiiller, links de confirmación reales; NO añadir enlaces falsos y NO aplicar el template global al proyecto compartido.
4. Migrar esquema y políticas RLS de las tablas Fiiller relevantes, índices, funciones y almacenamiento. Auditar todas las dependencias de `auth.users` antes de mover personal/usuarios y sus permisos.
5. Importar identidades de forma segura: diseñar estrategia de contraseñas/identidades existente y posible restablecimiento. Nunca exportar hashes o claves a archivos públicos. Mantener UUID solo si se verifica procedimiento compatible; no inventar equivalencias.
6. Ejecutar pruebas con cuentas no productivas: registro y confirmación, recuperación, login, roles admin/cocina, creación y lectura de pedidos, monitor y notificación, rechazo por RLS.
7. Cambiar endpoints/configuración de frontend y funciones en **una sola transición controlada**, con rollback documentado. No borrar el proyecto original ni sus registros hasta comprobar operación normal.
8. Realizar pruebas de recepción en Gmail, deliverability de Resend, móvil y expiración del enlace.

## Seguridad
- Mantener `FILLER_RESEND_API_KEY` exclusivamente en secrets del servidor; nunca GitHub ni JS público.
- SMTP/Send Email Hook de Supabase tienen efecto en todo su proyecto; cambiar únicamente el proyecto dedicado.
- No agregar trigger que mande mensajes al registrarse antes de verificar el correo del propietario.
- Registrar estado de envío sin escribir tokens, contraseñas o claves en logs.

## Estado
Documento operativo, **no es migración ejecutada**. Sitio de producción todavía utiliza proyecto compartido para registro/confirmación.
