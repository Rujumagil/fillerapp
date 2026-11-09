# Fiiller Pedidos · inicio automático en Windows

Elige una sola ventana para uso diario: **Pedidos** (operar estados e imprimir) o **Monitor** (ver comandas). No es necesario abrir ambas en la misma PC.

## Configuración, una sola vez

1. En Microsoft Edge, abre https://www.fiillercafe.app/pedidos.html e instala **Fiiller Pedidos** desde el menú del navegador. Activa las notificaciones de Edge/Fiiller en Windows.
2. Abre Fiiller Pedidos, inicia sesión con usuario autorizado **cocina** o **admin** y pulsa **Activar alarma y probar sonido**. Confirma que suena y que puedes cerrar la ventana de prueba con **Entendido**. El sonido requiere la activación inicial por parte del operador.
3. En Windows: Configuración → Sistema → Energía → establece **Nunca** para suspensión mientras esté conectada a corriente. En Sistema → Notificaciones habilita avisos de Fiiller/Edge y desactiva No molestar durante servicio.
4. Para abrir automáticamente al iniciar sesión en Windows, descarga el archivo [iniciar-fiiller-pedidos.cmd](../windows/iniciar-fiiller-pedidos.cmd). Copia el archivo a una carpeta fija del equipo. Pulsa **Win+R**, escribe `shell:startup` y coloca **un acceso directo** al archivo .cmd en esa carpeta. Esta configuración se realiza localmente en la computadora.
5. Reinicia Windows y comprueba que la ventana abra correctamente. Si el navegador no conserva la sesión, vuelve a iniciar sesión; no almacenes contraseñas en el archivo de inicio.

## Validación diaria
- Comprueba que el indicador diga **En línea con Supabase** y cambie su hora cada 3 segundos.
- Prueba el botón de sonido.
- Ante desconexiones, la pantalla avisa y reintenta automáticamente al recuperar internet.
- Para verificar pedidos reales, realiza un pedido de prueba de bajo importe con autorización del establecimiento y confirma llegada, alarma y cambio a Preparando.

**Alcance:** La app no puede encender Windows ni garantizar sonidos con la sesión cerrada o el navegador suspendido por el sistema. Este procedimiento no habilita Web Push de cocina cuando la aplicación está cerrada. Las sesiones del personal continúan protegidas; puede ser necesario volver a iniciar sesión tras cerrar la ventana.
