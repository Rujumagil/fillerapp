# Filler Café — Activación de pedidos entre dispositivos

## Situación verificada (14 octubre de 2026)
- La versión pública sigue registrando pedidos en `localStorage`; por eso no llegan a otra PC.
- Se creó en Supabase (proyecto compartido Compás One, ID `qwxydjotwhniahaovrff`) el RPC `filler_place_order` y la tabla `filler_extras`. Se añadieron extras al detalle de pedidos.
- En el momento de la revisión había **0 productos, 0 pedidos y 0 usuarios de Filler autorizados** en la nube.
- El código nuevo se preparó en la rama `feature/filler-pedidos-nube-alarma`, **sin mezclarla a main**.

## Qué hace la nueva interfaz
- `index.html`: usa `filler-cloud.js` y `storefront-cloud.js`; obtiene catálogo del servidor y solo confirma un pedido si Supabase responde con un código real. No simula la recepción.
- `menu-control.html`: permite iniciar sesión como administrador e importar **por primera vez** el menú actualmente configurado en el navegador. Bloquea la importación si ya existe un catálogo remoto, para proteger existencias.
- `pedidos.html`: exige autenticación Supabase y rol de Filler. Consulta pedidos cada 3 segundos, actualiza estados y genera sonido Web Audio al llegar uno nuevo después de pulsar «Activar sonido».
- `monitor.html`: también exige acceso autorizado y actualiza cada 3 segundos; incluye botón de activar sonido y notificaciones locales cuando la página está abierta.
- `sw.js`: nueva versión de caché para todos los módulos.

## Tareas necesarias antes de pasar a producción
1. Preguntar al propietario qué correo de Supabase debe tener rol administrador de Filler Café. Confirmar que ese usuario exista en `auth.users`.
2. Autorizar **únicamente** el usuario indicado mediante `public.filler_staff`. SQL de ejemplo, ejecutado **solo después de confirmar el correo**:

   ```sql
   insert into public.filler_staff(user_id,role)
   select id,'admin' from auth.users where lower(email)=lower('CORREO_CONFIRMADO')
   on conflict(user_id) do update set role=excluded.role;
   ```

   No registrar como staff a todos los usuarios de Compás One.
3. Acceder a `menu-control.html` con la cuenta autorizada y sincronizar el catálogo real del navegador del encargado. Revisar precios, existencias, nombres y extras primero.
4. Iniciar sesión en `pedidos.html` y/o `monitor.html` desde otra PC. Pulsar **Activar sonido y probar alarma** y conceder notificaciones del navegador si se desea.
5. Desde otro dispositivo, colocar un pedido de prueba, confirmar que aparezca en cocina y se escuche. Cambiar su estado y verificar en monitor. Revisar existencia y total.
6. Antes de mezclar la rama, auditar protección anti-abuso de la función pública; el control actual limita intentos por número de teléfono, lo cual **no sustituye** CAPTCHA o rate limit por IP.
7. Conectar almacenamiento público de fotos y edición remota de precios/extras en una segunda fase. Las fotos de IndexedDB no cruzan dispositivos.

## Limitaciones declaradas
- Sonido/aviso mientras la página esté abierta y autorizada; **no hay Web Push con la página cerrada**.
- La información se actualiza mediante **polling** cada ~3 s; el navegador puede espaciar consultas en segundo plano.
- La base compartida es la misma de Compás One, pero con tablas `filler_*`, permisos y políticas separados.
- Los pedidos locales **anteriores** no se migran automáticamente a Supabase.
- Fotos en IndexedDB y cambios hechos solo en `localStorage` continúan siendo locales hasta completar migración.
- El procedimiento de pedidos usa `SECURITY DEFINER` con acceso público intencional para el cliente, lo que aparece como aviso del asesor de Supabase. Mantener validación y vigilancia de anti-abuso antes de producción.
