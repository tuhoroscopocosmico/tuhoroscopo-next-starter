# Admin Operations — Panel de administración THC

## Acceso y autenticación

**URL:** `/admin/login`  
**Credenciales:** `ADMIN_USERNAME` + `ADMIN_PASSWORD` (env vars en Vercel)  
**Sesión:** iron-session v8 con cookie httpOnly `thc_admin_session`  
**Guard:** `requireAdminSession()` en toda API route `/api/admin/*` y middleware en todas las rutas `/admin/*`

---

## Navegación (AdminNav)

9 secciones accesibles desde el header:

| Label | Ruta | Estado |
|---|---|---|
| Dashboard | `/admin` | Implementado |
| Suscriptores | `/admin/suscriptores` | Implementado |
| Mensajes | `/admin/mensajes-problematicos` | Implementado |
| Contenido | `/admin/contenido` | Implementado |
| Suscripciones | `/admin/suscripciones` | Implementado |
| Cupones | `/admin/cupones` | Implementado |
| Logs | `/admin/logs` | Implementado |
| Cron | `/admin/cron` | Implementado |
| Config | `/admin/config` | Implementado |

---

## /admin — Dashboard

**API:** `GET /api/admin/metricas-basicas` → `ef_admin_metricas_basicas`  
**API:** `GET /api/admin/resumen-diario` → `ef_admin_resumen_diario`

**Muestra:**
- 6 MetricCards: total suscriptores, premium activos, WhatsApp confirmados, mensajes enviados hoy, errores hoy, contenido generado hoy.
- Resumen diario: enviados, fallidos, errores del día actual (UTC).

**Acciones:** Ninguna. Solo lectura.

---

## /admin/suscriptores — Gestión de suscriptores

**API:** `GET /api/admin/suscriptores` → `ef_admin_listar_suscriptores`  
**API:** `GET /api/admin/suscriptor-detalle?id=N` → `ef_admin_ver_estado_suscriptor`  
**API:** `POST /api/admin/suscriptor-accion` → `ef_admin_cambiar_estado_suscriptor`  
**API:** `POST /api/admin/suscriptor-editar` (edición de campos básicos)

**Muestra:**
- Lista paginada: id, nombre, signo, estado_suscripcion, premium ✓/✗, WhatsApp confirmado ✓/✗, fecha_vencimiento_premium.
- Filtros: búsqueda por nombre, estado_suscripcion, premium_activo, whatsapp_confirmado.
- Click en fila → panel lateral de detalle del suscriptor.

**Detalle del suscriptor:**
- Datos del perfil (nombre, signo, contenido_preferido, estado, flags).
- 4 tarjetas de diagnóstico rápido.
- Advertencias de conciliación.
- Historial de suscripción.
- Pagos recientes.
- Contenido reciente.
- Mensajes recientes.

**Acciones disponibles (todas requieren motivo ≥ 5 chars):**

| Acción | Qué hace | Condición |
|---|---|---|
| Activar Premium | `premium_activo=true`, `estado_suscripcion=activa` | Solo si `premium_activo=false` |
| Desactivar Premium | `premium_activo=false` | Solo si `premium_activo=true` |
| Cambiar Vencimiento | Actualiza `fecha_vencimiento_premium` | Nueva fecha debe ser futura |
| Cambiar Estado Suscripción | Cambia `estado_suscripcion` | Valores válidos del enum |

**NO toca Mercado Pago.** Solo modifica la DB local.

**PII omitida en respuestas:** `mp_payer_email`, `mp_payer_id`, `init_point`.

---

## /admin/mensajes-problematicos — Outbox con errores

**API:** `GET /api/admin/mensajes-problematicos` → `ef_admin_listar_mensajes_problematicos`  
**API:** `GET /api/admin/mensaje-detalle?id=N` → `ef_admin_ver_mensaje`  
**API:** `POST /api/admin/mensaje-accion` (acciones sobre mensaje — pendiente de confirmar qué acciones están implementadas)

**Muestra:**
- Mensajes con `estado` en: `fallido`, `fallo_definitivo`, `procesando`.
- Tabla: id, tipo_mensaje, estado, intentos, último error, fecha.
- Filtros: estado, tipo_mensaje, rango de fechas.
- Click en fila → panel de detalle del mensaje.

**Detalle del mensaje:**
- Datos del mensaje (sin `whatsapp_destino` — PII omitida).
- Guía de diagnóstico según tipo de error.
- Link al log de `log_funciones` para ese mensaje.

**Acciones:** Pendiente de confirmar si hay acción de reintento manual implementada. Los reintentos automáticos son vía cron (`ef_whatsapp_reintentos`).

---

## /admin/contenido — Archivo de contenido premium

**API:** `GET /api/admin/contenido` → `ef_admin_listar_contenido_premium`  
**API:** `POST /api/admin/contenido-accion` (acción sobre contenido — pendiente de confirmar)

**Muestra:**
- Lista de contenido_premium: tipo, estado_envio, generado ✓/✗, ciclo_semana, signo, fechas.
- Filtros: tipo (diario/domingo), estado_envio, rango de fechas.
- Click en fila → detalle del contenido (sin datos sensibles de WhatsApp).

**Acciones:** Principalmente lectura. Pendiente de confirmar si hay acción de regeneración o reenvío implementada desde el panel.

---

## /admin/suscripciones — Contratos MP con conciliación

**API:** `GET /api/admin/suscripciones` → `ef_admin_listar_suscripciones`  
**API:** `GET /api/admin/suscripcion-detalle?id_suscriptor=N` → fetch-based con alertas de conciliación  
**API:** `POST /api/admin/suscripcion-accion` — `renovar_premium`

**Muestra:**
- Lista de suscripciones: id_suscriptor, estado, preapproval_status_mp, preapproval_id (mascarado: `ABCD...WXYZ`), fecha_vencimiento_actual.
- Filtros: estado, mp_status, rango de fechas, solo vencidas, solo con descuento.
- Strips de diagnóstico: count OK, vencidas, con descuento.
- Filtro "Con alertas" (detecta `diagnostico_admin.healthy=false`).
- Click en fila → modal con detalle y alertas.

**Modal de detalle:**
- 10 tipos de alertas de conciliación coloreadas por nivel (error/warning/info).
- Datos del suscriptor y la suscripción.
- Pagos recientes.
- Descuento aplicado (si aplica).

**Acción disponible:**

| Acción | Condición | Qué hace |
|---|---|---|
| `renovar_premium` (N meses) | `premium_activo=true` + `estado_suscripcion=activa` | Extiende `fecha_vencimiento_premium` N meses |

Requiere: motivo ≥ 5 chars, selección de meses (1-12).

**PII omitida:** `preapproval_id` mascarado, no se muestra `init_point`, `payer_email`, `payer_id`.

**NO implementado (deliberado):**
- Cancelar en Mercado Pago
- Modificar `preapproval_id`
- Editar o borrar pagos
- Crear/borrar suscripciones

---

## /admin/cupones — CRUD de descuentos

**API:** `GET /api/admin/cupones` → lista de códigos  
**API:** `POST /api/admin/cupones/accion` → crear, editar, activar, desactivar  
**API:** `GET /api/admin/cupones/usos` → historial de usos

**Muestra:**
- Lista de codigos_descuento: código, tipo, valor, usos actuales/total, activo, vigencia.
- Click en código → detalle con historial de usos.

**Acciones:**
- Crear nuevo código de descuento.
- Editar código existente (campos editables: valor, vigencia, límites, activo).
- Activar / Desactivar un código.

**Riesgo:** Los cupones con `usos_actuales > 0` no deben borrarse (historial). Solo desactivar.

---

## /admin/logs — Log de funciones

**API:** `GET /api/admin/logs` → `ef_admin_listar_logs` + resumen global desde Supabase directo

**Muestra:**
- Tabla: función, resultado, fecha, éxito ✓/✗.
- Filtros: nombre_funcion, exito (true/false), rango de fechas.
- Botones de rango rápido: 24h, 7d, 30d.
- Resumen global: total, errores históricos, errores en página, éxitos en página.
- Banner de último error global con función, resultado y tiempo relativo.
- "Mayor fuente de errores en página" con chip clickeable.
- Click en fila → modal de detalle del log.

**Modal de detalle:**
- Copy JSON button (detalle sanitizado).
- Copy resumen button.
- Indicador `ShieldAlert` si hay valores redactados.
- "Referencias detectadas": chips con links a rutas admin (id_suscriptor → /admin/suscriptores, id_contenido → /admin/contenido, etc.).
- Fecha completa + tiempo relativo.

**Sanitización:** Campos sensibles en `detalle` JSON reemplazados por `***redacted***`.  
Patrones detectados: `token`, `api_key`, `bearer`, `service_role`, `authorization`, `access_token`, `refresh_token`, `secret`, `password`, `credential`, `private_key`, `_key`.

**NO implementado:** Borrar logs, limpiar logs, editar logs.

---

## /admin/cron — Monitoreo de procesos automáticos

**API:** `GET /api/admin/cron` (no llama EF; consulta `log_funciones` directo + manifest estático)

**Muestra:**
- Resumen: total procesos, con error reciente, sin datos de ejecución.
- Banner informativo: pg_cron no es accesible desde el panel.
- 9 tarjetas de proceso:
  - Nombre, tipo (diario/semanal/frecuente/sub-proceso), categoría.
  - Última ejecución (fecha + "hace X min/h/d").
  - Último resultado y ícono OK/Error.
  - Contador de errores recientes.
  - Error detallado si el último run falló.
  - Footer: nombre función en mono + link "Ver en logs" → `/admin/logs?nombre_funcion=<fn>`.
- Sección de limitaciones conocidas.
- Botón Actualizar.

**Procesos monitoreados:** `ef_orquesta_envio_contenido_premium`, `ef_genera_guarda_contenido_premium`, `ef_genera_guarda_contenido_premium_domingo`, `ef_run_encolador_premium`, `ef_run_sender_batch`, `ef_whatsapp_reintentos`, `ef_procesar_vencimientos`, `ef_revisar_pendientes`, `fn_sql_sniper_sender`.

**NO implementado:** Activar/desactivar cron, editar horarios, crear/borrar jobs.

---

## /admin/config — Configuración del sistema

**API:** `GET /api/admin/config` (lee `public.config` + `public.configuracion` directo desde Supabase)  
**API:** `POST /api/admin/config/accion` (solo para `APP_DEBUG_MODE`)

**Muestra:**
- Sección "Controles editables": `APP_DEBUG_MODE` con toggle ON/OFF.
- Sección "public.config — solo lectura": resto de claves con valores (sensibles redactados).
- Sección "public.configuracion — solo lectura": datos de WhatsApp, precio, webhooks, etc.
  - `whatsapp_token_app` siempre redactado.
  - Lista expandible (mostrar/ocultar campos adicionales).

**Acción disponible:**

| Acción | Qué hace | Requiere |
|---|---|---|
| Toggle `APP_DEBUG_MODE` | Cambia valor en `config` table a `"true"` o `"false"` | Confirmación + motivo ≥ 5 chars |

El cambio se aplica en la próxima ejecución de Edge Functions que verifican este flag. No afecta instancias en curso.

**NO implementado:** Editar `configuracion`, cambiar credenciales WhatsApp, cambiar precio, cambiar versión de flujo.

---

## Reglas de seguridad del panel admin

1. **Toda API route admin** lleva `requireAdminSession()` como primera instrucción.
2. **Toda acción sensible** pide confirmación + motivo ≥ 5 caracteres.
3. **PII sanitizada:** No se expone `whatsapp_destino`, `mp_payer_email`, `mp_payer_id`, `init_point`.
4. **Secrets sanitizados:** Los campos sensibles en detalle JSON de logs se muestran como `***redacted***`.
5. **Masks:** `preapproval_id` en suscripciones se muestra como `ABCD...WXYZ` (primeros 4 + últimos 4).
6. **No llamar Edge Functions desde el browser** — todo pasa por API routes server-side.
7. **No exponer `SUPABASE_SERVICE_ROLE_KEY`** en el cliente.
