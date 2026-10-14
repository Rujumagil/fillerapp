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

## Acceso con nombre de usuario (sin correo visible)
La aplicación usa **usuario + contraseña**:
- `admin` — administra el catálogo y también puede entrar a cocina/monitor.
- `cocina` — solo recibe pedidos y modifica estados.

**Importante:** Supabase Auth internamente autentica por correo y contraseña. Para no pedir correos al personal, el cliente traduce **solo el nombre de usuario** a un identificador técnico, sin guardar claves en GitHub:
- `admin` corresponde a `filler.admin@proyectocompas.com`
- `cocina` corresponde a `filler.cocina@proyectocompas.com`

Estos identificadores **no son buzones ni cuentas creadas automáticamente**. Los usuarios se crean de forma manual en **Supabase → Authentication → Users → Add user** con contraseña robusta elegida privadamente en el panel de Supabase. Si la interfaz lo permite, usar `Auto Confirm User` al crear estos usuarios de uso interno. No se publican las contraseñas ni se envían por chat.

Después se asigna cada cuenta al rol de Filler correspondiente, **únicamente cuando exista en auth.users**:

```sql
insert into public.filler_staff(user_id,role)
select id, 'admin' from auth.users where lower(email)='filler.admin@proyectocompas.com'
on conflict(user_id) do update set role=excluded.role;

insert into public.filler_staff(user_id,role)
select id, 'cocina' from auth.users where lower(email)='filler.cocina@proyectocompas.com'
on conflict(user_id) do update set role=excluded.role;
```

Evitar contraseñas triviales, compartir la clave entre todos los equipos o agregar a personal de Compás One al rol Filler sin autorización.

## Tareas necesarias antes de pasar a producción
1. Crear los usuarios técnicos de Filler Café en Supabase Auth desde el panel privado, sin enviar las contraseñas en mensajes. Si todavía no se crearon, los formularios `admin` y `cocina` correctamente rechazarán el acceso.
2. Con autorización del propietario, vincular **solo** los IDs creados a los roles `admin` y `cocina` en `public.filler_staff` según el SQL anterior; comprobar el rol correcto.
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
