# Edge Functions Map — THC

**Ubicación:** `backend/supabase/functions/`  
**Runtime:** Deno  
**Auth entre funciones:** Header `x-internal-key` con valor de `WHATSAPP_INTERNAL_KEY` env var.  
**Convención de log:** Todas loguean a `log_funciones` con `nombre_funcion`, `resultado`, `detalle`, `exito`.

---

## Clasificación por tipo

| Tipo | Descripción |
|---|---|
| `webhook` | Procesa eventos externos (MP, WhatsApp) |
| `generacion` | Genera contenido con OpenAI |
| `envio` | Envía mensajes por WhatsApp |
| `cron` | Ejecutada periódicamente por pg_cron |
| `admin` | Solo lectura + acciones administrativas |
| `transaccional` | Crea/modifica recursos (suscriptor, suscripción) |
| `util` | Función utilitaria o de soporte |

---

## Webhooks (receptores de eventos externos)

### `ef_webhook_mp`
- **Tipo:** webhook
- **Propósito:** Procesa eventos de Mercado Pago (preapproval + pagos).
- **Acceso:** Pública (llamada directamente por MP). Verifica firma/token interno.
- **x-internal-key:** No (MP llama directamente; tiene validación propia).
- **Tablas:** `suscriptores`, `suscripciones`, `pagos`, `mensajes_enviados`, `log_funciones`.
- **Lógica principal:**
  - `topic=preapproval` → sincroniza estado MP → actualiza `premium_activo`, `estado_suscripcion`, `preapproval_status`.
  - `topic=payment` → crea registro en `pagos`, activa premium si no estaba activo, encola `bienvenida_validacion_numero` (solo si `bienvenida_enviada=false`).
  - Llama a `ef_aplicar_codigo_descuento` si hay descuento pendiente.
- **Servicios externos:** Mercado Pago API (para verificar estado del preapproval).
- **Versión en código:** V18+

### `ef_webhook_whatsapp_inbound`
- **Tipo:** webhook
- **Propósito:** Procesa mensajes entrantes de usuarios por WhatsApp.
- **Acceso:** Pública (llamada por Meta Webhook).
- **x-internal-key:** No.
- **Tablas:** `suscriptores`, `mensajes_enviados`, `log_funciones`, `whatsapp_webhook_events`.
- **Lógica principal:**
  - Identifica suscriptor por número de WA.
  - Si mensaje ≠ "BAJA" y `premium_activo=true` → confirma número (`whatsapp_confirmado=true`).
  - "BAJA" → `estado_mensaje=pausado_usuario`, encola template de baja (rate limit: 1x/24h).
  - "ALTA" / "ACTIVAR" / "REACTIVAR" / "VOLVER" → `estado_mensaje=activo`.
  - "AYUDA" → encola `ayuda_usuario`.
  - "ESTADO" → encola `estado_usuario`.
  - Al confirmar: encola `confirmacion_numero_ok`, llama `ef_genera_guarda_contenido_premium` on-demand.
- **Servicios externos:** Ninguno directo (encola mensajes que el sender envía).

### `ef_webhook_whatsapp_events`
- **Tipo:** webhook
- **Propósito:** Captura todos los eventos de WhatsApp (status, mensajes) para auditoría.
- **Tablas:** `whatsapp_webhook_events`, `log_funciones`.

### `ef_webhook_whatsapp_status`
- **Tipo:** webhook
- **Propósito:** Procesa actualizaciones de estado de mensajes (delivered, read, failed).
- **Tablas:** `mensajes_enviados` (actualiza `fecha_delivered`, `fecha_read`, estado), `contenido_premium`, `log_funciones`.

---

## Generación de contenido

### `ef_genera_guarda_contenido_premium`
- **Tipo:** generacion / cron / on-demand
- **Propósito:** Genera contenido diario premium para suscriptores elegibles.
- **Acceso:** Interna.
- **x-internal-key:** Sí.
- **Tablas:** `suscriptores` (lee), `contenido_premium` (inserta), `emocion_dominante`, `paleta_colores`, `rango_numeros`, `plantillas` (prompt), `log_funciones`.
- **Modos:**
  - `CRON`: genera para todos los suscriptores con `premium_activo=true`, `whatsapp_confirmado=true`, `primer_envio_premium_enviado=true`, `estado_mensaje=activo` sin contenido de hoy.
  - `ON_DEMAND`: genera para un suscriptor específico (body: `{ id_suscriptor }`).
- **Lógica:**
  1. Selecciona emoción aleatoria → grupo.
  2. Resuelve color desde `paleta_colores[grupo]`.
  3. Resuelve número desde `rango_numeros[grupo]`.
  4. Carga prompt desde `plantillas[nombre='prompt_contenido_premium']`.
  5. Llama `ef_openia_genera_contenido_premium`.
  6. Guarda en `contenido_premium` con `fecha_envio_programada = now + 2min`.
- **Idempotencia:** No genera si ya existe contenido para el mismo suscriptor y día.
- **Servicios externos:** OpenAI (vía `ef_openia_genera_contenido_premium`).

### `ef_genera_guarda_contenido_premium_domingo`
- **Tipo:** generacion / cron
- **Propósito:** Igual que la anterior pero para el mensaje especial de domingo.
- **Tablas:** Igual que anterior + `desafios_cosmicos`.
- **Servicios externos:** OpenAI (vía `ef_openia_genera_contenido_premium_domingo`).

### `ef_openia_genera_contenido_premium`
- **Tipo:** util / generacion
- **Propósito:** Llama a OpenAI API y devuelve JSON de contenido.
- **Acceso:** Interna (llamada desde `ef_genera_guarda_contenido_premium`).
- **x-internal-key:** Sí.
- **Tablas:** `log_funciones`.
- **Servicios externos:** OpenAI API (modelo: `gpt-4o-mini`).
- **Salida esperada:** JSON con `horoscopo`, `frase`, `numero_suerte`, `color_suerte`, etc.

### `ef_openia_genera_contenido_premium_domingo`
- **Tipo:** util / generacion
- **Propósito:** Igual para contenido de domingo.
- **Servicios externos:** OpenAI API.

---

## Envío de mensajes

### `ef_whatsapp_sender` ⭐ Central
- **Tipo:** envio
- **Propósito:** Ejecuta el envío de un mensaje del outbox. NO decide qué enviar — solo ejecuta.
- **Acceso:** Interna.
- **x-internal-key:** Sí.
- **Body:** `{ id_mensaje }` (ID de `mensajes_enviados`).
- **Tablas:** `mensajes_enviados` (lee + actualiza), `plantillas` (resuelve template), `suscriptores` (verifica estado), `log_funciones`.
- **Lógica:**
  1. Lee fila de `mensajes_enviados`.
  2. Verifica que el suscriptor puede recibir mensajes.
  3. Resuelve template desde `plantillas`.
  4. Llama WhatsApp Cloud API.
  5. Actualiza estado en `mensajes_enviados` y `contenido_premium`.
- **Servicios externos:** WhatsApp Cloud API (Meta).
- **Versión:** V2.0 con outbox pattern.

### `ef_run_sender_batch`
- **Tipo:** cron / envio
- **Propósito:** Procesa mensajes pendientes del outbox en batch.
- **Acceso:** Cron (pg_cron, cada pocos minutos).
- **x-internal-key:** Sí.
- **Tablas:** `mensajes_enviados` (lee pendientes), llama `ef_whatsapp_sender` por cada uno.
- **Lock:** Usa `pg_advisory_lock` para evitar ejecuciones paralelas.
- **Tablas config:** Lee `config[APP_DEBUG_MODE]`.

### `ef_whatsapp_reintentos`
- **Tipo:** cron / envio
- **Propósito:** Reprocesa mensajes fallidos que cumplieron el backoff.
- **Acceso:** Cron (pg_cron, ~cada 5 minutos).
- **Condición:** `estado=fallido`, `intentos < MAX_RETRY`, `reintentar_despues < now()`.
- **Tablas:** `mensajes_enviados`, llama `ef_whatsapp_sender`.

### `ef_envio_premium_post_confirmacion`
- **Tipo:** envio / on-demand
- **Propósito:** Envía el primer mensaje premium cuando el usuario confirma su WhatsApp.
- **Acceso:** Llamado desde `ef_webhook_whatsapp_inbound` tras confirmación.
- **Tablas:** `contenido_premium`, `mensajes_enviados`, `suscriptores`, `log_funciones`.
- **Lógica:** Encola `primer_mensaje_premium` + cuerpo del primer contenido premium. Marca `primer_envio_premium_enviado=true`.

---

## Cron (automáticos)

### `ef_run_encolador_premium`
- **Tipo:** cron
- **Propósito:** Orquesta el flujo diario: determina qué suscriptores reciben contenido y los encola.
- **Frecuencia:** Diaria (pg_cron).
- **Tablas:** `suscriptores`, `contenido_premium`, `mensajes_enviados`, `log_funciones`.
- **Llama a:** `ef_genera_guarda_contenido_premium`, `ef_run_sender_batch`.

### `ef_orquesta_envio_contenido_premium`
- **Tipo:** cron
- **Propósito:** Orquestador principal del envío diario premium.
- **Llama a:** `ef_genera_guarda_contenido_premium` → `ef_run_encolador_premium`.

### `ef_procesar_vencimientos`
- **Tipo:** cron / util
- **Propósito:** Desactiva premium de suscriptores con suscripción cancelada cuya fecha de vencimiento ya pasó.
- **Frecuencia:** Diaria (pg_cron).
- **Tablas:** `suscriptores` (actualiza `premium_activo=false`).

### `ef_revisar_pendientes`
- **Tipo:** cron / util
- **Propósito:** Cancela/expira suscripciones en `pendiente_autorizacion` con TTL vencido.
- **Frecuencia:** Diaria (pg_cron).
- **Tablas:** `suscripciones`, `suscriptores`.

---

## Transaccionales (alta de suscriptor)

### `ef_alta_suscriptor_premium`
- **Tipo:** transaccional
- **Propósito:** Crea o actualiza un suscriptor premium.
- **Acceso:** Llamada desde `/api/iniciar-checkout` (server-side, no pública).
- **x-internal-key:** Sí.
- **Body:** `{ nombre, telefono, whatsapp, signo, contenido_preferido, pais, acepto_politicas, ... }`.
- **Tablas:** `suscriptores` (upsert por WhatsApp).
- **Normalización:** `09XXXXXXXX` → `whatsapp=+5989XXXXXXXX`, `telefono=9XXXXXXXX`.
- **Retorna:** `{ id_suscriptor }`.

### `ef_crear_suscripcion`
- **Tipo:** transaccional
- **Propósito:** Crea preapproval recurrente en Mercado Pago.
- **Acceso:** Llamada desde `/api/iniciar-checkout`.
- **x-internal-key:** Sí.
- **Body:** `{ id_suscriptor, codigo_descuento? }`.
- **Tablas:** `suscripciones` (inserta/reutiliza), `codigos_descuento` (valida descuento).
- **Servicios externos:** Mercado Pago API.
- **Reutilización:** Si el suscriptor tiene preapproval pendiente de < 24h, lo reutiliza.
- **Retorna:** `{ init_point, preapproval_id }`.
- **Versión:** V11+.

---

## Descuentos

### `ef_validar_codigo_descuento`
- **Tipo:** util
- **Propósito:** Valida si un código de descuento es aplicable (sin consumir el cupo).
- **Acceso:** Pública (llamada desde checkout).
- **Body:** `{ codigo, precio_base }`.
- **Tablas:** `codigos_descuento` (solo lectura).
- **Retorna:** `{ ok, tipo_descuento, precio_aplicado, mensaje_usuario }`.

### `ef_aplicar_codigo_descuento`
- **Tipo:** transaccional
- **Propósito:** Aplica el descuento post-autorización de MP. Incrementa `usos_actuales`.
- **Acceso:** Interna (llamada desde `ef_webhook_mp`).
- **x-internal-key:** Sí.
- **Tablas:** `codigos_descuento` (incrementa `usos_actuales`), `codigos_descuento_usos` (inserta), `suscripciones` (actualiza `descuento_estado=aplicado`), `log_funciones`.

---

## Administración (solo lectura + acciones controladas)

Todas requieren `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` + `x-internal-key`.

| Función | Propósito | Tablas principales |
|---|---|---|
| `ef_admin_metricas_basicas` | Métricas del dashboard | suscriptores, suscripciones, mensajes_enviados, contenido_premium, pagos, log_funciones |
| `ef_admin_resumen_diario` | Resumen del día (enviados, fallidos, errores) | mensajes_enviados, log_funciones |
| `ef_admin_listar_suscriptores` | Lista paginada de suscriptores (sin PII sensible) | suscriptores |
| `ef_admin_ver_estado_suscriptor` | Detalle completo de un suscriptor | suscriptores, suscripciones, pagos, mensajes_enviados, contenido_premium |
| `ef_admin_listar_mensajes_problematicos` | Mensajes fallidos/procesando | mensajes_enviados |
| `ef_admin_ver_mensaje` | Detalle de un mensaje + guía de reintentos | mensajes_enviados, log_funciones |
| `ef_admin_listar_contenido_premium` | Archivo de contenido generado | contenido_premium |
| `ef_admin_listar_suscripciones` | Contratos MP (preapproval_id mascarado) | suscripciones, suscriptores |
| `ef_admin_listar_logs` | Log de funciones con filtros | log_funciones |
| `ef_admin_cambiar_estado_suscriptor` | Acciones manuales sobre suscriptor | suscriptores |

### `ef_admin_cambiar_estado_suscriptor`
Acciones disponibles:
- `activar_premium_manual` — activa `premium_activo=true` + `estado_suscripcion=activa`
- `desactivar_premium_manual` — desactiva `premium_activo=false`
- `cambiar_fecha_vencimiento` — extiende `fecha_vencimiento_premium`
- `cambiar_estado_suscripcion` — cambia `estado_suscripcion` a un valor válido

Requiere: `motivo` (≥ 5 caracteres). NO toca Mercado Pago.

---

## Funciones SQL (pg_cron, no Edge Functions)

### `fn_sql_sniper_sender`
- **Tipo:** SQL function ejecutada por pg_cron
- **Propósito:** Fallback de envío directo. Usa `net.http_post` para llamar `ef_whatsapp_sender`.
- **Corre en:** Motor PostgreSQL (no Deno).
- **Registra en:** `log_funciones` con `creado_por=pg_cron`.

---

## Funciones que NO deben desplegarse

### `ef_debug_env`
- **Estado:** Existe en el repo local, NO debe desplegarse a producción.
- **Propósito declarado:** Debug de variables de entorno.
- **Riesgo:** Expone secrets si se despliega.
