# Subscription Rules — Flags y estados de suscripción

## Tabla de referencia: `suscriptores`

Los flags de suscripción viven en la tabla `suscriptores`. Esta tabla es la fuente de verdad del estado de un usuario.

---

## Flags críticos y su semántica

### `premium_activo` (boolean)

**Qué significa:** El usuario tiene acceso activo al servicio premium en este momento.

**Se activa cuando:**
- El webhook de MP (`ef_webhook_mp`) procesa un preapproval con `status=authorized` y el pago es confirmado.
- Un admin activa manualmente desde el panel (`accion=activar_premium_manual`).

**Se desactiva cuando:**
- El webhook de MP procesa un preapproval cancelado o pausado.
- `ef_procesar_vencimientos` detecta que `fecha_vencimiento_premium` ya pasó y `estado_suscripcion` es `cancelada_no_renueva`.
- Un admin desactiva manualmente desde el panel (`accion=desactivar_premium_manual`).

**Impacto:** Sin `premium_activo=true`, el usuario no recibe contenido. `ef_genera_guarda_contenido_premium` y `ef_run_encolador_premium` filtran por este flag.

---

### `estado_suscripcion` (text)

**Valores posibles:**
- `pendiente_autorizacion` — El usuario inició el flujo pero MP aún no autorizó el preapproval.
- `activa` — Suscripción activa y corriente.
- `suspendida` — Suscripción pausada temporalmente (MP status: paused).
- `cancelada_no_renueva` — El usuario canceló; sigue activo hasta `fecha_vencimiento_premium`.
- `finalizada` — El período pago terminó y `premium_activo` fue desactivado.

**Relación con MP:** `suscripciones.preapproval_status_mp` refleja el estado real en MP. `suscriptores.estado_suscripcion` es el estado interno del sistema THC.

**Regla clave:** Un usuario puede tener `premium_activo=true` + `estado_suscripcion=cancelada_no_renueva` (pagó, canceló, pero aún le quedan días). `ef_procesar_vencimientos` resuelve esto diariamente.

---

### `whatsapp_confirmado` (boolean)

**Qué significa:** El usuario respondió al mensaje de bienvenida y su número de WhatsApp está confirmado.

**Se activa cuando:**
- `ef_webhook_whatsapp_inbound` recibe cualquier mensaje entrante del usuario (excepto BAJA) y `premium_activo=true`.

**Impacto:** Hasta que este flag sea `true`, el usuario NO recibe contenido premium (aunque `premium_activo=true`). El primer envío premium (`ef_envio_premium_post_confirmacion`) depende de este flag.

---

### `bienvenida_enviada` (boolean)

**Qué significa:** El mensaje de bienvenida (`bienvenida_validacion_numero` template) ya fue enviado al usuario.

**Se activa cuando:**
- `ef_webhook_mp` procesa el primer pago aprobado y encola el mensaje de bienvenida en `mensajes_enviados`.

**Propósito:** Evitar reenviar la bienvenida en cada renovación mensual. Una vez enviada, no se vuelve a enviar.

**Estado en suscriptores:** `bienvenida_enviada=true` persiste indefinidamente.

---

### `primer_envio_premium_enviado` (boolean)

**Qué significa:** El primer mensaje de contenido premium fue enviado exitosamente al usuario.

**Se activa cuando:**
- `ef_envio_premium_post_confirmacion` envía exitosamente el primer contenido premium después de que el usuario confirmó su WhatsApp.

**Impacto:** Una vez activo, el usuario entra al flujo de contenido diario regular. Antes de esto, la cron de generación no genera contenido para este suscriptor (no está en el pipeline regular todavía).

---

### `fecha_inicio_premium` (date)

**Qué significa:** La fecha en que el premium fue activado por primera vez para este usuario.

**Se establece cuando:**
- El webhook de MP activa el premium por primera vez.

**No se resetea** en renovaciones mensuales.

---

### `fecha_vencimiento_premium` (date)

**Qué significa:** Hasta cuándo tiene acceso premium el usuario.

**Se establece cuando:**
- El webhook de MP activa/renueva el premium (fecha actual + período de suscripción).
- Un admin extiende manualmente desde el panel (`accion=renovar_premium`, API: `POST /api/admin/suscripcion-accion`).

**Usa `ef_procesar_vencimientos`:** Diariamente verifica si `fecha_vencimiento_premium < now()` y `estado_suscripcion=cancelada_no_renueva` → desactiva `premium_activo`.

---

### `preapproval_id` / `preapproval_status` (text)

**`preapproval_id`:** ID del contrato de suscripción recurrente en Mercado Pago.

**`preapproval_status`:** Estado en MP. Valores: `pending`, `authorized`, `paused`, `cancelled`.

**Fuente de verdad MP:** La tabla `suscripciones` tiene más detalle (`preapproval_status_mp`). `suscriptores.preapproval_status` es un reflejo simplificado.

---

### `estado_mensaje` (text)

**Valores:** `activo`, `pausado_usuario`

**Se establece cuando:**
- El usuario envía "BAJA" a WhatsApp → `ef_webhook_whatsapp_inbound` setea `estado_mensaje=pausado_usuario`.
- El usuario envía "ALTA", "ACTIVAR", "REACTIVAR", "VOLVER" → se resetea a `activo`.

**Impacto:** Cuando `estado_mensaje=pausado_usuario`, los mensajes no se envían aunque `premium_activo=true`. El sender (`ef_whatsapp_sender`) y el encolador verifican este flag.

---

## Tabla `suscripciones` — campos clave adicionales

| Campo | Significado |
|---|---|
| `preapproval_status_mp` | Estado real en MP: authorized, paused, cancelled, pending, expired |
| `provisional` | True si el preapproval no fue aún autorizado formalmente |
| `auto_renovacion_activa` | Si MP renueva automáticamente |
| `descuento_estado` | Estado del cupón: validado, pendiente_aplicacion, aplicado, fallido |
| `fecha_vencimiento_actual` | Fecha de vencimiento del período actual según MP |
| `fecha_cancelacion` | Cuándo se canceló (si aplica) |

---

## Cuándo un usuario puede recibir contenido premium

El usuario recibe contenido si **TODOS** estos conditions son true:

1. `premium_activo = true`
2. `whatsapp_confirmado = true`
3. `primer_envio_premium_enviado = true`
4. `estado_mensaje = 'activo'`
5. No tiene contenido generado para hoy ya en `contenido_premium` (idempotencia)

---

## Pausa / Reactivación

| Comando WA | Acción |
|---|---|
| "BAJA" | `estado_mensaje=pausado_usuario` (no cancela MP) |
| "ALTA" / "ACTIVAR" / "REACTIVAR" / "VOLVER" | `estado_mensaje=activo` |

La pausa es del mensaje, no de la suscripción MP. El usuario sigue siendo cobrado mensualmente.

---

## Conciliación de alertas (desde el panel admin)

El panel `/admin/suscripciones` detecta y muestra 10 tipos de inconsistencias entre tablas:

- `pago_aprobado_sin_premium` — Hay pago aprobado pero `premium_activo=false`. **Error.**
- `premium_activo_sin_suscripcion_activa` — `premium_activo=true` pero `estado_suscripcion` no es `activa`. **Error.**
- `mp_authorized_local_inconsistente` — MP dice `authorized` pero localmente `premium_activo=false`. **Error.**
- `suscripcion_vencida_premium_activo` — `fecha_vencimiento_premium` pasó pero `premium_activo=true`. **Warning.**
- `premium_activo_sin_fecha_vencimiento` — `premium_activo=true` pero `fecha_vencimiento_premium` es null. **Warning.**
- `descuento_pendiente_aplicacion` — Cupón con `estado=pendiente_aplicacion`. **Warning.**
- `descuento_fallido` — Cupón falló al aplicarse. **Warning.**
- `preapproval_status_problematico` — `preapproval_status_mp` es `paused` o `cancelled`. **Warning.**
- `pagos_rechazados` — Tiene pagos con status rechazado. **Warning.**
- `pagos_pendientes` — Tiene pagos en estado pendiente. **Info.**
- `suscripcion_activa_sin_wa_confirmado` — `premium_activo=true` pero `whatsapp_confirmado=false`. **Warning.**
