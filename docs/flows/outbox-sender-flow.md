# Outbox / Sender Flow — Patrón de envío de mensajes

## Principio

> **El sender no decide. Ejecuta.**

Todos los mensajes de WhatsApp (bienvenida, confirmación, contenido diario, respuestas a comandos) pasan por el outbox (`mensajes_enviados`) antes de ser enviados. El sender (`ef_whatsapp_sender`) solo ejecuta lo que encuentra en la cola.

---

## Tabla outbox: `mensajes_enviados`

Cada mensaje que debe enviarse se registra como una fila en `mensajes_enviados` antes de intentar el envío.

**Estados del ciclo de vida:**

```
pendiente → procesando → enviado → entregado → leído
                ↓
             fallido → [reintento] → enviado
                ↓
         fallo_definitivo (sin más reintentos)
```

| Estado | Descripción |
|---|---|
| `pendiente` | Encolado, aún no procesado |
| `procesando` | Siendo procesado por el sender (lock activo) |
| `enviado` | WhatsApp API respondió OK; WAMID guardado |
| `entregado` | Meta confirma entrega al dispositivo (webhook de status) |
| `leído` | Meta confirma que fue leído (webhook de status) |
| `fallido` | Error en envío; puede reintentarse |
| `fallo_definitivo` | Superó MAX_RETRY o error irrecuperable; no se reintenta |

---

## Quién encola en `mensajes_enviados`

| Origen | Tipo de mensaje |
|---|---|
| `ef_webhook_mp` (pago aprobado) | Bienvenida (`bienvenida_validacion_numero`) |
| `ef_webhook_whatsapp_inbound` (BAJA) | Info de baja (`baja_info_mp`, `baja_thc`) |
| `ef_webhook_whatsapp_inbound` (ALTA) | Ninguno (solo actualiza estado) |
| `ef_webhook_whatsapp_inbound` (AYUDA) | `ayuda_usuario` |
| `ef_webhook_whatsapp_inbound` (ESTADO) | `estado_usuario` |
| `ef_webhook_whatsapp_inbound` (confirmación) | `confirmacion_numero_ok` |
| `ef_envio_premium_post_confirmacion` | `primer_mensaje_premium` + contenido |
| `ef_run_encolador_premium` (CRON) | Contenido premium diario |

---

## Sender: `ef_whatsapp_sender`

**Input:** `{ id_mensaje }` (ID de la fila en `mensajes_enviados`)

**Proceso:**
1. Lee la fila de `mensajes_enviados` con ese ID.
2. Verifica precondiciones:
   - Suscriptor tiene `premium_activo=true` (si es contenido premium).
   - Suscriptor tiene `estado_mensaje=activo`.
3. Resuelve plantilla: lee `nombre_plantilla` → busca en `plantillas` → obtiene nombre real Meta.
4. Construye el body de la API call (template + variables).
5. Llama WhatsApp Cloud API (`graph.facebook.com/v*/messages`).
6. Si éxito:
   - `mensajes_enviados.estado = 'enviado'`
   - `mensajes_enviados.mensaje_id_whatsapp = <WAMID>`
   - `mensajes_enviados.fecha_enviado = now()`
   - `mensajes_enviados.resultado_envio = true`
   - Actualiza `contenido_premium.estado_envio = 'enviado'` (si aplica).
7. Si error:
   - `mensajes_enviados.estado = 'fallido'`
   - `mensajes_enviados.ultimo_error = <mensaje_error>`
   - `mensajes_enviados.intentos += 1`
   - `mensajes_enviados.fecha_ultimo_intento = now()`
   - Calcula `reintentar_despues` (backoff exponencial).
8. Registra en `log_funciones`.

---

## Sender batch: `ef_run_sender_batch`

**Tipo:** CRON, frecuente (cada pocos minutos)

**Proceso:**
1. Adquiere `pg_advisory_lock` para evitar ejecuciones paralelas.
2. Lee mensajes con `estado=pendiente` de `mensajes_enviados`.
3. Para cada uno: marca `estado=procesando`, llama `ef_whatsapp_sender`.
4. Libera el lock.

**Notas:**
- Si el batch falla a mitad, los mensajes en `procesando` pueden quedar stuck. Hay lógica de reset para mensajes en `procesando` con mucho tiempo (pendiente de confirmar timeout exacto).
- Lee `config[APP_DEBUG_MODE]` para comportamiento en debug.

---

## Reintentos: `ef_whatsapp_reintentos`

**Tipo:** CRON, frecuente (~cada 5 minutos)

**Condición para reintentar:**
- `estado = 'fallido'`
- `intentos < MAX_RETRY` (pendiente de confirmar valor exacto)
- `reintentar_despues < now()` (backoff cumplido)

**Proceso:**
1. Lee mensajes fallidos elegibles.
2. Para cada uno: llama `ef_whatsapp_sender`.
3. El sender incrementa `intentos` y actualiza estado.

**Cuándo pasa a `fallo_definitivo`:**
- `intentos >= MAX_RETRY`.
- Error irrecuperable (número inválido, cuenta bloqueada, etc.).

---

## Sniper SQL: `fn_sql_sniper_sender`

**Tipo:** SQL function ejecutada por pg_cron

**Propósito:** Fallback de envío directo. Usa la extensión `pg_net` (`net.http_post`) para llamar `ef_whatsapp_sender` desde PostgreSQL.

**Cuándo se usa:** Pendiente de confirmar — posiblemente como capa redundante si el sender batch no llega a tiempo.

**Logs:** Registra en `log_funciones` con `creado_por='pg_cron'`.

---

## Anti-duplicados

**En `mensajes_enviados`:** El encolador verifica idempotencia por `id_contenido` antes de insertar. No se crean dos filas de outbox para el mismo `id_contenido`.

**En `contenido_premium`:** `ef_genera_guarda_contenido_premium` verifica si ya existe contenido para el mismo `id_suscriptor` y la misma fecha antes de insertar.

**Locks:** `ef_run_sender_batch` usa `pg_advisory_lock` para evitar que dos instancias del batch procesen el mismo mensaje en paralelo.

---

## Relación con `contenido_premium`

```
contenido_premium
  estado_envio: pendiente → encolado → enviado

mensajes_enviados
  estado: pendiente → procesando → enviado
```

Cuando `ef_run_encolador_premium` encola contenido:
1. Lee `contenido_premium` con `estado_envio='pendiente'`.
2. Inserta fila en `mensajes_enviados`.
3. Actualiza `contenido_premium.estado_envio = 'encolado'`.

Cuando `ef_whatsapp_sender` envía:
1. Actualiza `mensajes_enviados.estado = 'enviado'`.
2. Actualiza `contenido_premium.estado_envio = 'enviado'` + `fecha_envio_real`.

---

## Panel admin: mensajes problemáticos

El panel `/admin/mensajes-problematicos` muestra mensajes con:
- `estado = 'fallido'`
- `estado = 'fallo_definitivo'`
- `estado = 'procesando'` (posiblemente stuck)

Desde el panel se puede ver:
- Detalle del mensaje (sin `whatsapp_destino` — PII omitida).
- Guía de diagnóstico según el error.
- Link al log de la función correspondiente.

**No hay acción de reintento desde el panel.** Los reintentos son automáticos vía cron.

---

## Entrega y lectura

Los webhooks de status de WhatsApp (`ef_webhook_whatsapp_status`) actualizan:
- `mensajes_enviados.estado = 'entregado'` cuando Meta confirma delivery.
- `mensajes_enviados.estado = 'leído'` cuando Meta confirma lectura.
- `mensajes_enviados.fecha_delivered`, `fecha_read`.
