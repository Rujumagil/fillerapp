# Envío push de Filler Café (todavía no desplegado)

Worker de prueba aislado. Solo `POST /send-test` con un token secreto puede enviar un aviso estático a una suscripción concreta. No hay envíos comerciales ni integración automática con pedidos.

## Configurar

1. Desde `push-worker/`, ejecutar `npm install` para generar el lockfile y verificar la instalación.
2. Generar un par VAPID con `npx web-push generate-vapid-keys`. La clave privada **no** debe ir a GitHub.
3. Configurar con `wrangler secret put`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (correo mailto), `SUPABASE_SERVICE_ROLE_KEY` y `FILLER_TEST_TOKEN`.
4. Copiar únicamente la clave **pública** a `../push-config.js`.
5. Confirmar aviso de privacidad, redirección de Auth y pruebas del registro antes de publicar Mi Filler.
6. Desplegar con `npm run deploy` solo tras revisar el entorno.
7. Registrar un dispositivo autorizado y obtener su ID desde una sesión de administración segura.
8. Realizar una prueba autorizada con `POST /send-test` y JSON `{"subscription_id":"UUID"}`.

No exponer el token de prueba al navegador. La clave de servicio Supabase es privilegiada y solo pertenece al entorno de servidor.

La activación de avisos al cambiar un pedido a `Listo` requiere un disparador backend con autorización, idempotencia y un vínculo fiable entre pedido y usuario. No está implementada en esta fase.
