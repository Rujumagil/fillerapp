# Filler App

App web para menu digital, pedidos para recoger y control de existencias.

## Estructura inicial

- `index.html`: app estatica completa.
- `package.json`: scripts basicos para vista local.

## Modulos

- Portada
- Menu
- Acceso cliente
- Admin de pedidos y existencias

## Cloudflare Pages

Configuracion sugerida:

- Framework preset: `None`
- Build command: vacio
- Build output directory: `/`

## Siguiente etapa

- Separar datos del menu en `data/menu.json`.
- Agregar fotos reales de productos.
- Conectar pedidos a Supabase o Cloudflare D1.
- Enviar avisos por WhatsApp o correo cuando el pedido este listo.
