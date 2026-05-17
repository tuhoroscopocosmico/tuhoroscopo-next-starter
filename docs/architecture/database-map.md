# Database Map — Tablas principales de THC

**Fuente de verdad:** `backend/supabase/migrations/20260514195212_initial_schema.sql`

---

## `suscriptores`

**Propósito:** Tabla central. Cada fila es un usuario del sistema.

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer PK | ID interno del suscriptor |
| `nombre` | text | Nombre del usuario |
| `email` | text | Email (opcional) |
| `telefono` | text | Teléfono normalizado (9XXXXXXXX) |
| `whatsapp` | text | WhatsApp normalizado (+598XXXXXXXX) |
| `signo` | text | Signo zodiacal |
| `contenido_preferido` | text | Preferencia: meditación, abundancia, amor, etc. |
| `tipo_suscripcion` | text | `premium` o `gratis` |
| `estado_suscripcion` | text | `pendiente_autorizacion`, `activa`, `suspendida`, `cancelada_no_renueva`, `finalizada` |
| `premium_activo` | boolean | ¿Tiene premium activo ahora? |
| `whatsapp_confirmado` | boolean | ¿Confirmó su número de WA? |
| `bienvenida_enviada` | boolean | ¿Se envió el mensaje de bienvenida? |
| `primer_envio_premium_enviado` | boolean | ¿Se envió el primer contenido premium? |
| `fecha_inicio_premium` | date | Cuándo empezó el premium |
| `fecha_vencimiento_premium` | date | Hasta cuándo tiene premium |
| `preapproval_id` | text | ID del contrato MP |
| `preapproval_status` | text | Estado MP: pending/authorized/paused/cancelled |
| `mp_payer_email` | text | Email del pagador en MP (PII — no exponer en admin) |
| `mp_payer_id` | text | ID del pagador en MP (PII — no exponer en admin) |
| `estado_mensaje` | text | `activo` o `pausado_usuario` |
| `fecha_confirmacion_whatsapp` | timestamp | Cuándo confirmó |
| `fecha_primer_envio_premium` | timestamp | Cuándo recibió primer contenido |
| `acepto_politicas` | boolean | Consentimiento |
| `creado_en` | timestamp | Alta del registro |
| `actualizado_en` | timestamp | Última modificación |

**Estados de `estado_suscripcion`:**
- `pendiente_autorizacion` → esperando que MP autorice el preapproval
- `activa` → suscripción corriente
- `suspendida` → pausada en MP
- `cancelada_no_renueva` → canceló pero sigue activo hasta vencimiento
- `finalizada` → período terminado, premium desactivado

**Procesos que la modifican:** `ef_webhook_mp`, `ef_webhook_whatsapp_inbound`, `ef_procesar_vencimientos`, `ef_revisar_pendientes`, `ef_admin_cambiar_estado_suscriptor`, `ef_alta_suscriptor_premium`, API routes admin.

---

## `suscripciones`

**Propósito:** Contratos de suscripción recurrente con Mercado Pago. Una por suscriptor (puede tener historial).

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | ID interno |
| `suscriptor_id` | integer FK | Referencia a `suscriptores.id` |
| `provider` | text | `mercadopago` |
| `preapproval_id` | text | ID contrato MP |
| `estado` | text | Estado interno (mirror de `suscriptores.estado_suscripcion`) |
| `preapproval_status_mp` | text | Estado en MP: authorized, paused, cancelled, pending, expired |
| `provisional` | boolean | True si aún no fue autorizado |
| `auto_renovacion_activa` | boolean | Si MP renueva automáticamente |
| `amount` | numeric | Monto mensual |
| `currency_id` | text | `UYU` |
| `codigo_descuento` | text | Código de descuento usado |
| `codigo_descuento_id` | uuid FK | Referencia a `codigos_descuento.id` |
| `descuento_estado` | text | validado, pendiente_aplicacion, aplicado, fallido |
| `descuento_metadata` | jsonb | Detalle del descuento |
| `init_point` | text | URL de pago MP (sensible — no exponer en admin) |
| `fecha_activacion_definitiva` | timestamp | Cuándo MP autorizó |
| `fecha_vencimiento_actual` | date | Vencimiento período actual |
| `fecha_cancelacion` | timestamp | Cuándo se canceló |

**Procesos que la modifican:** `ef_crear_suscripcion`, `ef_webhook_mp`, `ef_aplicar_codigo_descuento`, `ef_revisar_pendientes`.

---

## `pagos`

**Propósito:** Registro de pagos individuales procesados por MP.

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id_pago` | integer PK | ID interno |
| `suscriptor_id` | integer FK | Referencia a `suscriptores.id` |
| `status` | text | `approved`, `pending`, `rejected` |
| `amount` | numeric | Monto del pago |
| `currency` | text | `UYU` |
| `mp_payment_id` | text | ID del pago en MP (sensible) |
| `preapproval_id` | text | Contrato MP asociado |
| `procesado` | boolean | Si fue procesado internamente |
| `raw` | jsonb | Payload original del webhook MP |
| `created_at` | timestamp | Fecha del registro |
| `fecha_pago` | timestamp | Fecha del pago según MP |

**Procesos que la modifican:** `ef_webhook_mp` (inserta al procesar webhook de pago).

---

## `contenido_premium`

**Propósito:** Contenido diario generado por IA para cada suscriptor premium. Un registro por suscriptor por día (idempotente).

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer PK | ID del contenido |
| `id_suscriptor` | integer FK | Suscriptor destino |
| `contenido` | jsonb | JSON con horoscopo, frase, número, color, etc. |
| `tipo` | text | `diario` o `domingo` |
| `estado_envio` | text | `pendiente`, `encolado`, `enviado`, `fallido` |
| `generado` | boolean | Si fue generado exitosamente |
| `generado_por` | text | Qué función lo generó |
| `emocion_dominante` | text | Emoción asignada para el día |
| `color` | text | Color de suerte |
| `numero` | smallint | Número de suerte (1-99) |
| `ciclo_semana` | text | Identificador de ciclo semanal |
| `fecha_envio_programada` | timestamp | Cuándo debe enviarse |
| `fecha_envio_real` | timestamp | Cuándo se envió efectivamente |
| `mensaje_id_whatsapp` | text | WAMID de Meta post-envío |
| `ultimo_error` | text | Último error si falló |
| `origen_generacion` | text | `cron`, `on_demand`, etc. |
| `meta_generacion` | jsonb | Metadata del proceso de generación |

**Estados de `estado_envio`:**
- `pendiente` → generado, aún no encolado
- `encolado` → tiene entrada en `mensajes_enviados`
- `enviado` → `ef_whatsapp_sender` confirmó envío
- `fallido` → falló definitivamente

**Procesos que la modifican:** `ef_genera_guarda_contenido_premium`, `ef_genera_guarda_contenido_premium_domingo`, `ef_run_encolador_premium`, `ef_whatsapp_sender`, `ef_actualiza_envio_real_premium`.

---

## `mensajes_enviados`

**Propósito:** Tabla OUTBOX. Registra todos los mensajes que deben enviarse por WhatsApp. Es la fuente de verdad del estado de envío.

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer PK | ID del mensaje |
| `id_suscriptor` | integer FK | Destinatario |
| `id_contenido` | integer FK | Contenido asociado (si aplica) |
| `whatsapp_destino` | text | Número WA (sensible — no exponer en admin) |
| `tipo_mensaje` | text | Nombre lógico del mensaje (`bienvenida_validacion_numero`, `premium_diario`, etc.) |
| `nombre_plantilla` | text | Nombre template en Meta |
| `estado` | text | `pendiente`, `procesando`, `enviado`, `entregado`, `leído`, `fallido`, `fallo_definitivo` |
| `canal_envio` | text | `whatsapp` |
| `intentos` | integer | Cantidad de intentos realizados |
| `fecha_ultimo_intento` | timestamp | Cuándo fue el último intento |
| `mensaje_id_whatsapp` | text | WAMID de Meta |
| `resultado_envio` | boolean | Si el último envío tuvo éxito |
| `ultimo_error` | text | Último error |
| `metadata` | jsonb | Variables del template, cuerpo del mensaje |
| `fecha_creado` | timestamp | Cuándo fue encolado |
| `fecha_enviado` | timestamp | Cuándo fue enviado |
| `fecha_delivered` | timestamp | Cuándo llegó al dispositivo |
| `fecha_read` | timestamp | Cuándo fue leído |

**Estados del outbox:**
- `pendiente` → en cola, no procesado aún
- `procesando` → siendo procesado por sender (lock en curso)
- `enviado` → API WA respondió OK
- `entregado` → status webhook: delivered
- `leído` → status webhook: read
- `fallido` → falló pero puede reintentarse
- `fallo_definitivo` → superó MAX_RETRY o error irrecuperable

**Procesos que la modifican:** `ef_webhook_mp` (encola bienvenida), `ef_webhook_whatsapp_inbound` (encola respuestas), `ef_run_encolador_premium` (encola contenido), `ef_whatsapp_sender` (actualiza estado), `ef_whatsapp_reintentos` (reintentos), `ef_webhook_whatsapp_status` (actualiza entregado/leído).

---

## `plantillas`

**Propósito:** Registro de plantillas de WhatsApp. El sender resuelve el nombre Meta desde aquí.

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer PK | ID |
| `nombre` | text | Nombre lógico interno |
| `contenido` | text | Nombre real en Meta |
| `canal` | text | `whatsapp` |
| `activo` | boolean | Si está disponible |
| `header_activo` | boolean | Si tiene header multimedia |
| `header_tipo` | text | `image`, `video`, `document` |
| `header_url` | text | URL del media |
| `header_media_id` | text | Media ID en Meta |

**Procesos que la consultan:** `ef_whatsapp_sender` (resuelve plantilla antes de enviar).

---

## `codigos_descuento`

**Propósito:** Catálogo de códigos de descuento válidos.

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | ID |
| `codigo` | text | Código alfanumérico (ej: "TEST50") |
| `tipo_descuento` | text | `porcentaje`, `monto_fijo`, `primera_cuota`, `dias_gratis`, `meses_gratis` |
| `valor_descuento` | numeric | Valor del descuento |
| `precio_recurrente_normal` | numeric | Precio mensual regular |
| `precio_primera_cuota` | numeric | Precio primera cuota con descuento |
| `cantidad_ciclos_descuento` | integer | Cuántos ciclos aplica el descuento |
| `max_usos_total` | integer | Límite total de usos |
| `usos_actuales` | integer | Usos actuales |
| `max_usos_por_usuario` | integer | Límite por usuario |
| `fecha_inicio` / `fecha_fin` | timestamp | Período de vigencia |
| `solo_nuevos_usuarios` | boolean | Solo para altas nuevas |
| `activo` | boolean | Si está habilitado |

**Procesos que la modifican:** `ef_validar_codigo_descuento` (lee), `ef_aplicar_codigo_descuento` (incrementa `usos_actuales`), API routes admin cupones (CRUD completo).

---

## `codigos_descuento_usos`

**Propósito:** Registro de cada uso de un código de descuento.

**Campos clave:** `id`, `codigo_id` (FK), `codigo`, `id_suscriptor`, `preapproval_id`, `estado_uso` (`reservado`, `aplicado`, `cancelado`, `expirado`, `fallido`), `precio_original`, `precio_aplicado`, `valor_descuento_aplicado`, `fecha_reserva`, `fecha_aplicacion`, `ultimo_error`.

---

## `log_funciones`

**Propósito:** Tabla de observabilidad. Todas las Edge Functions loguean aquí al ejecutarse.

**Campos clave:**

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | integer PK | ID |
| `nombre_funcion` | text | Nombre de la EF que lo generó |
| `fecha_ejecucion` | timestamp | Cuándo ocurrió |
| `resultado` | text | Código de resultado (ej: "ok", "no_premium", "error_openai") |
| `detalle` | jsonb | Metadata detallada del resultado |
| `exito` | boolean | Si la ejecución fue exitosa |
| `creado_por` | text | `webhook`, `pg_cron`, `system`, `admin_panel` |

**No se borra ni edita.** Solo se inserta. El panel admin permite filtrar y leer logs.

---

## `configuracion`

**Propósito:** Fila única con configuración estructurada del sistema.

**Campos clave:** `id`, `whatsapp_token_app` (sensible — siempre redactado), `whatsapp_phone_number_id`, `whatsapp_business_id`, `nombre_plantilla`, `url_webhook_premium`, `url_webhook_gratis`, `link_pago_premium`, `precio_actual`, `version_flujo`, `admin_contacto`.

**Solo lectura desde el panel admin.** Modificaciones requieren acceso directo a la DB.

---

## `config`

**Propósito:** Tabla key-value para configuraciones simples del sistema.

**Campos:** `id`, `nombre` (clave), `valor`, `created_at`.

**Uso conocido:** `APP_DEBUG_MODE` (`true`/`false`) — controla modo debug en Edge Functions.

**Editable desde el panel admin** (solo `APP_DEBUG_MODE`). El resto es solo lectura.

---

## Tablas auxiliares

| Tabla | Propósito |
|---|---|
| `emocion_dominante` | Catálogo de emociones para generación de contenido |
| `paleta_colores` | Colores por grupo emocional (con peso y activo) |
| `rango_numeros` | Rangos de números de suerte por grupo emocional |
| `signos` | Catálogo de signos zodiacales con emoji e imagen |
| `productos` | Catálogo de productos (gratis/premium) |
| `desafios_cosmicos` | Desafíos cósmicos para mensajes de domingo |
| `whatsapp_webhook_events` | Log crudo de todos los eventos WA entrantes |
| `process_locks` | Locks distribuidos para evitar ejecuciones paralelas |
| `admin_users` | Usuarios del panel admin (email + activo) |
| `contenido_gratis` | Archivo de contenido del plan gratuito |
| `cat_estado_pago_mp` | Catálogo de estados de pago MP |
