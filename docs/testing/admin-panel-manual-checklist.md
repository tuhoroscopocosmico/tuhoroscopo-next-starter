# Checklist Manual — Panel Admin THC

Fecha de documentación: 2026-05-15
Entorno objetivo: staging o producción (solo lectura / acciones reversibles)

---

## Convenciones

- `[ ]` = pendiente de verificar
- `[x]` = verificado OK
- `[!]` = issue detectado

Marcar con la fecha de ejecución al completar.

---

## 1. Login / Logout

### Login
- [ ] Navegar a `/admin/login`
- [ ] Verificar que la página carga sin errores JS en consola
- [ ] Ingresar credenciales incorrectas → mensaje de error visible ("Credenciales inválidas" o similar)
- [ ] Ingresar credenciales correctas → redirección a `/admin`
- [ ] Verificar que la cookie `thc_admin_session` existe en DevTools → Application → Cookies (debe ser httpOnly)
- [ ] Intentar acceder a `/admin` sin sesión (desde incógnito) → redirección a `/admin/login`

### Logout
- [ ] Desde el Dashboard, hacer clic en "Cerrar sesión"
- [ ] Verificar redirección a `/admin/login`
- [ ] Verificar que la cookie `thc_admin_session` ya no existe
- [ ] Intentar acceder a `/admin` directamente → redirección a `/admin/login`
- [ ] Repetir prueba de logout desde cada página: Suscriptores, Mensajes, Contenido, Suscripciones, Logs

---

## 2. Navegación

- [ ] Desde Dashboard: hacer clic en cada uno de los 6 links → página correcta carga
- [ ] Verificar que el item activo está resaltado (texto blanco + borde violeta inferior) en cada página
- [ ] Verificar que los demás items están en gris
- [ ] No hay links rotos (error 404)
- [ ] El header muestra el logo/título en todas las páginas

---

## 3. Dashboard (`/admin`)

- [ ] Las 6 MetricCards cargan: Total suscriptores, Premium activos, WhatsApp confirmados, Mensajes enviados hoy, Errores hoy, Contenido generado hoy
- [ ] Si hay datos: los números se muestran correctamente (sin NaN, sin undefined)
- [ ] Si hay error de API: se muestra mensaje de error (no pantalla en blanco)
- [ ] El resumen diario carga: enviados, fallidos, errores del día
- [ ] El resumen muestra 0 correctamente cuando no hay datos del día (sin crash)

---

## 4. Suscriptores (`/admin/suscriptores`)

### Lista
- [ ] La tabla carga con datos
- [ ] Loading state visible mientras carga (texto "Cargando suscriptores…")
- [ ] Con filtros que no devuelven resultados: mensaje "Sin resultados para estos filtros."
- [ ] Si hay error de API: mensaje de error visible sobre la tabla
- [ ] Los badges de estado suscripción se muestran con colores correctos
- [ ] La columna Premium muestra ✓ verde o ✗ gris según corresponda
- [ ] La columna WA ✓ muestra ✓ verde o ✗ gris según corresponda
- [ ] La columna Vencimiento muestra "—" cuando no hay fecha

### Filtros
- [ ] Buscar por nombre → filtra correctamente (Enter o botón Buscar)
- [ ] Filtro estado suscripción → funciona (activa, suspendida, cancelada, finalizada)
- [ ] Filtro premium activo → funciona
- [ ] Filtro WA confirmado → funciona
- [ ] Paginación: Anterior/Siguiente funcionan y muestran el conteo correcto

### Detalle de suscriptor
- [ ] Hacer clic en una fila → panel de detalle aparece debajo
- [ ] Hacer clic en la misma fila → panel se cierra (toggle)
- [ ] El panel muestra: datos principales, suscripción actual (si existe), últimos mensajes, mensajes fallidos, contenido premium, pagos recientes
- [ ] Botón X cierra el panel
- [ ] Warnings visibles si existen
- [ ] Diagnóstico cards: 4 stats (Premium, WhatsApp, Suscripción, Outbox)

### Acciones admin (solo si hay un suscriptor de prueba disponible)
- [ ] Botón "Activar Premium" visible cuando `premium_activo=false`
- [ ] Botón "Desactivar Premium" visible cuando `premium_activo=true`
- [ ] Botón "Cambiar Vencimiento" siempre visible
- [ ] Botón "Cambiar Estado" siempre visible
- [ ] Al hacer clic en una acción: panel de confirmación con impacto visible
- [ ] Sin motivo (< 5 chars): botón confirmar deshabilitado
- [ ] Con motivo válido y fecha (para activar/cambiar vencimiento): botón habilitado
- [ ] Al confirmar: resultado visible (verde = éxito, rojo = error)
- [ ] Tras éxito: el detalle se recarga automáticamente con los nuevos datos (~1.8s)
- [ ] Cancelar desde el panel de confirmación: vuelve a los botones de acción

---

## 5. Mensajes problemáticos (`/admin/mensajes-problematicos`)

### Lista
- [ ] La tabla carga
- [ ] Loading visible
- [ ] Si no hay mensajes problemáticos: "Sin mensajes problemáticos" (estado saludable)
- [ ] Columnas: ID, tipo, estado, plantilla, intentos, último error, fecha
- [ ] Badges de estado con colores: fallido (amber), fallo_definitivo (rojo), procesando (azul)
- [ ] Intentos ≥ 5 en rojo, ≥ 3 en amber

### Filtros
- [ ] Filtro por estado funciona
- [ ] Filtro por tipo_mensaje funciona
- [ ] Paginación funciona

### Detalle de mensaje
- [ ] Hacer clic en una fila → panel de detalle aparece
- [ ] Panel muestra: estado (badge), nombre suscriptor, datos del mensaje, último error, suscriptor (contexto), contenido asociado (si aplica), metadata (expandible), logs relacionados
- [ ] "Reintento box" muestra acción recomendada y si es reintentable
- [ ] Botón X cierra el panel
- [ ] Si el mensaje no existe: "Mensaje no encontrado"

---

## 6. Contenido (`/admin/contenido`)

- [ ] La tabla carga con el contenido premium generado
- [ ] Loading visible
- [ ] Estado vacío: mensaje apropiado cuando no hay contenido
- [ ] Si hay error: mensaje de error visible
- [ ] Columnas con datos correctos: tipo, estado_envio, generado, ciclo_semana, fechas
- [ ] Filtros por tipo, estado_envio, rango de fechas funcionan
- [ ] No se expone información personal del suscriptor (solo id_suscriptor numérico)

---

## 7. Suscripciones (`/admin/suscripciones`)

### Lista
- [ ] La tabla carga
- [ ] Loading visible
- [ ] Sin resultados: "Sin resultados para los filtros actuales"
- [ ] Error de API: mensaje visible
- [ ] preapproval_id aparece enmascarado (`first4...last4`), nunca completo
- [ ] init_point / back_url NO aparecen en ningún lugar de la tabla ni el detalle
- [ ] Fechas de vencimiento pasadas aparecen en rojo

### Filtros
- [ ] Filtro por estado local funciona
- [ ] Filtro por MP status funciona
- [ ] Filtro por rango de fechas funciona
- [ ] Botón "Solo vencidas" funciona
- [ ] Botón "Solo con descuento" funciona
- [ ] Botón "Limpiar fechas" aparece solo cuando hay fechas aplicadas y funciona
- [ ] Paginación funciona

### Diagnóstico (conteo strips)
- [ ] Si hay datos de diagnóstico (ok/vencida/etc.): badges aparecen en la barra
- [ ] Warnings del sistema visibles si existen

### Detalle de suscripción
- [ ] Hacer clic en una fila → panel de detalle aparece
- [ ] Detalle muestra: estado local, MP status, datos de cobro, fechas, descuento (si tiene)
- [ ] preapproval_id en detalle también enmascarado
- [ ] init_point no aparece
- [ ] Hacer clic en la misma fila cierra el detalle
- [ ] Botón X también cierra

---

## 8. Logs (`/admin/logs`)

- [ ] La tabla carga
- [ ] Loading visible
- [ ] Sin resultados: "Sin resultados para los filtros actuales" (en tbody)
- [ ] Error de API: mensaje visible
- [ ] Columnas: función, resultado, fecha, éxito (✓ verde / ✗ rojo)
- [ ] Filtros por nombre_funcion, exito (true/false), rango de fechas funcionan
- [ ] Paginación funciona
- [ ] El campo `detalle` JSONB no se expone en la lista (no hay PII en la vista de logs)

---

## 9. Casos límite / resiliencia

- [ ] Desconectar red mientras carga → mensaje de error (no pantalla en blanco)
- [ ] Expirar sesión manualmente (borrar cookie en DevTools) y hacer una acción → redirección a login o error 401 visible
- [ ] Hacer clic muy rápido en "Buscar" varias veces → no se duplican requests con resultados incorrectos
- [ ] Abrir dos pestañas del panel, cerrar sesión en una → la otra debería mostrar error 401 en el próximo request

---

## 10. Seguridad básica

- [ ] La cookie `thc_admin_session` tiene flag `HttpOnly` (no accesible desde JS)
- [ ] La cookie tiene flag `Secure` en producción (HTTPS)
- [ ] Acceder a `/api/admin/suscriptores` directamente sin sesión → 401
- [ ] Acceder a `/api/admin/suscriptor-accion` sin sesión → 401
- [ ] Las respuestas de la API no incluyen campos: `payer_email`, `payer_id`, `init_point`, `back_url`, `sandbox_init_point`, `telefono`, `notas_internas`, `preapproval_id` (solo masked)
- [ ] Las respuestas de mensajes no incluyen: `whatsapp_destino`, `resultado_envio` completo

---

## Notas para el tester

- **No ejecutar acciones admin sobre suscriptores reales** sin coordinación
- Para probar AccionesPremium usar el usuario de prueba del flujo E2E (ver `docs/testing/sql-reset-e2e-test-user.sql`)
- Si algo falla inesperadamente, revisar `/admin/logs` primero — todas las EFs loguean en `log_funciones`
- El resumen diario del Dashboard refleja datos del día UTC actual
