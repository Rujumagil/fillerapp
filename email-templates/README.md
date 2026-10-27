# Plantillas de correo · Fiiller Café

Plantillas HTML preparadas para confirmar registro y recuperar contraseña.

**Importante:** el registro actual de Mi Fiiller utiliza el proyecto Supabase `qwxydjotwhniahaovrff`, compartido con otros proyectos. NO pegar estas plantillas en Auth > Email Templates de dicho proyecto sin antes aislar la autenticación de Fiiller o crear una solución que seleccione plantillas por aplicación. La configuración de correo de Supabase es a nivel de proyecto.

## Asuntos propuestos
- Confirmación: `Mi Fiiller ☕ Confirma tu cuenta`
- Recuperación: `Mi Fiiller | Recupera tu contraseña`

## Variables
Se utilizan las variables oficiales `{{ .ConfirmationURL }}` y `{{ .Data.filler_display_name }}` de Supabase Auth. El logotipo usa la ruta pública bajo el dominio configurado en CNAME: https://fiillercafe.app/assets/filler-logo-oficial.webp

## Pendiente antes de producción
1. Aislar la configuración de autenticación de Fiiller o implementar plantillas por aplicación.
2. Configurar un servicio SMTP transaccional autorizado con DNS SPF, DKIM y DMARC para el dominio.
3. Validar URL de retorno /mi-filler.html y verificar envío real, bandeja de entrada, spam y dispositivos móviles.
4. Nunca reemplazar globalmente los correos de Compás One con marca Fiiller.
