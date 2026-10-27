# Plantilla compartida de confirmación — Fiiller condicional

## Alcance
El proyecto `qwxydjotwhniahaovrff` es COMPARTIDO con Compás One. **No cambiar globalmente sin revisar y respaldar la plantilla actual.**
La condición `{{ if .Data.filler_display_name }}` muestra el diseño Fiiller para los registros de Mi Fiiller; el `else` es la plantilla genérica conocida. Si otros proyectos ya tienen un correo personalizado, **reemplazarlo con este ejemplo eliminaría su diseño**. Primero copiar el HTML actual, conservar ese contenido completo en el `else` y probar.

## Pasos de activación manual
1. En Supabase: Authentication → Email Templates → Confirm signup.
2. Guardar una copia exacta del asunto y HTML actuales antes de cambiar.
3. Usar el bloque Fiiller del archivo `confirmacion-condicional.html` y conservar el HTML original en el bloque `else`.
4. Mantener el asunto compartido existente: el asunto **no puede quedar distinto por marca** con la configuración global simple.
5. Usar Preview y probar registro de Fiiller y registro de otro proyecto, además del enlace de verificación, antes de aplicar en producción.
6. Para remitente `hola@fiillercafe.app` y asunto propio Fiiller en el primer correo es necesario envío personalizado por aplicación o migración de autenticación.

**Estado:** archivos preparados en GitHub, no activados en Supabase. La tabla de limitación `filler_auth_email_rate_limits` no se utiliza por ahora.
