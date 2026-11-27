# Fiiller Café · Auditoría de datos y seguimiento de KPIs (noviembre 2026)

## Cambios
1. Vista de resumen: **De los hallazgos a las acciones**, dentro del resumen ejecutivo.
2. Relación por fecha de cortes TPV Arrow y tickets faltantes para el periodo seleccionado.
3. Relación por código de artículos del TPV sin clasificación confirmada cocina/retail, con exportación CSV.
4. Seguimiento por mes con estado, responsable, nota y progreso; se conserva en `localStorage` en este navegador.
5. Preparación de consulta en el cajón existente Compás Fly Quality, bajo confirmación del usuario; los avances manuales se adjuntan al contexto supervisado si el usuario envía la consulta.
6. Corrección del pronóstico: si faltan cortes, mostrar el **número real de fechas faltantes** y suspender la estimación; no afirmar que faltan tres días cuando ya hay más cortes.
7. Comparación intermensual: no presentar porcentajes como comparables cuando hay cobertura incompleta de cortes. El valor del mes previo permanece como **referencia**, no un resultado definitivo.

## Verificación sintáctica y simulada
- [x] JavaScript original del dashboard (modificado) compila.
- [x] Módulo nuevo de calidad y seguimiento compila.
- [x] HTML incluye los identificadores usados en el módulo sin duplicados.
- [x] Simulación: 14 de 20 días hábiles con corte y seis sin tickets; panel muestra 14/20 y 6 pendientes.
- [x] Simulación: dos artículos, uno sin clasificación por MXN $240; panel y exportación conceptual indican 1 código / $240.
- [x] Simulación: cambiar estado de una acción a «En curso», recargar los datos del mes y conservar el avance en el almacenamiento del navegador.
- [x] No se añadieron endpoints de escritura a ventas, tickets ni inventario.

## Pruebas con sesión administrativa pendientes
- [ ] Verificar 6 fechas concretas reales sin corte contra el detalle diario del dashboard.
- [ ] Confirmar que los días de no operación son distinguidos manualmente de un corte no recibido; **no** recalcular los KPIs hasta disponer de registro oficial.
- [ ] Comprobar códigos sin clasificar y descargar CSV. La clasificación deberá corregirse en el origen, no en este panel.
- [ ] Registrar progreso en un navegador, recargar y cambiar el mes. **No** afirmar sincronización multiusuario: los avances solo están almacenados localmente.
- [ ] Abrir Fly Quality desde el tablero: debe preparar el texto, pero no enviar ninguna consulta hasta que el administrador presione «Consultar».
- [ ] Confirmar reporte exportado, modo sin sesión y restricciones por rol.
- [ ] Revisar diseño móvil / escritorio en GitHub Pages y fuente CSP si cambia.

## Integridad y límites
- Los pedidos digitales siguen **separados** de las ventas TPV, sin sumar pedidos no cobrados.
- «Sin corte» y «Sin tickets» son **datos ausentes**, no montos de cero.
- Una clasificación sin acceso se informa como **fuente no disponible** y genera acción de revisión; no se marca todo como clasificado.
- Estados de acción «Realizado» y porcentajes son **declaraciones manuales**, no evidencia de cierre validado.
- El tablero no registra compras, ventas, ajustes de inventario ni cambios de clasificación.
- No se crean tablas nuevas ni se altera Supabase; cualquier sincronización central de tareas requiere un servicio autorizado y RLS validado.
