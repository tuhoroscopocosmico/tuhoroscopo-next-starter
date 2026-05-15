# E2E: Flujo Premium THC — Registro → WhatsApp → Contenido

Fecha de documentación: 2026-05-14
Entorno objetivo: **sandbox / staging** (nunca producción directamente)

---

## Visión general del flujo

```
Usuario llena /checkout
       ↓
POST /api/iniciar-checkout
  ├─ ef_alta_suscriptor_premium   → crea fila en suscriptores
  └─ ef_crear_suscripcion         → crea preapproval en MP → devuelve init_point
       ↓
Redirección a Mercado Pago (sandbox)
       ↓
MP dispara webhook preapproval → ef_webhook_mp (handlePreapproval)
  → suscriptores: premium_activo=true, estado_suscripcion=activa
  → suscripciones: preapproval_status=authorized
       ↓
MP dispara webhook payment → ef_webhook_mp (handlePayment)
  [sandbox: requiere x-manual-test:true header o topic=payment_trigger]
  → pagos: insert / upsert
  → suscriptores: fecha_vencimiento_premium calculada
  → Si bienvenida_enviada ≠ true:
      → mensajes_enviados: encola bienvenida_validacion_numero (template)
      → ef_whatsapp_sender: envía template al WhatsApp del usuario
      → suscriptores: bienvenida_enviada=true
       ↓
Usuario recibe WhatsApp con template bienvenida_validacion_numero
       ↓
Usuario responde (texto o reaction) — cualquier cosa excepto "BAJA"
       ↓
ef_webhook_whatsapp_inbound (CAPA 2)
  → Gate: verifica que bienvenida fue enviada (mensajes_enviados)
  → suscriptores: whatsapp_confirmado=true, fecha_confirmacion_whatsapp=now
  → mensajes_enviados: encola confirmacion_numero_ok (template)
  → ef_whatsapp_sender: envía template de confirmación
  → Si sender OK: dispara ef_genera_guarda_contenido_premium (on-demand)
       ↓
ef_genera_guarda_contenido_premium (on-demand, id_suscriptor)
  → Genera contenido via ef_openia_genera_contenido_premium (OpenAI)
  → Persiste en contenido_premium (fecha_envio_programada = now+2min)
       ↓
ef_envio_premium_post_confirmacion (on-demand, id_suscriptor)
  [disparado desde ef_webhook_whatsapp_inbound vía ef_genera_guarda_contenido_premium]
  → Encola primer_mensaje_premium (template)
  → ef_whatsapp_sender: envía template primer_mensaje_premium
  → Encola mensaje premium (tipo_mensaje=premium, nombre_plantilla=null, cuerpo en metadata)
  → ef_whatsapp_sender: envía mensaje premium
  → suscriptores: primer_envio_premium_enviado=true
```

---

## Paso 1 — Registro del usuario

**Endpoint:** `POST /api/iniciar-checkout` (Next.js route)

**Responsabilidad:**
1. Valida campos del formulario (nombre, telefono, signo, contenido_preferido, whatsapp, acepto_politicas)
2. Llama a `ef_alta_suscriptor_premium` → crea o actualiza fila en `suscriptores`
3. Llama a `ef_crear_suscripcion` → crea preapproval en MP → devuelve `init_point`
4. Devuelve `{ init_point, id_suscriptor }` al frontend

**Normalización de WhatsApp (Uruguay):**
- Input usuario: `09XXXXXXXX` (10 dígitos, empieza con 09)
- `telefono` en DB: `9XXXXXXXX` (sin cero inicial)
- `whatsapp` en DB: `+5989XXXXXXXX` (E.164)

**Campos creados en `suscriptores` tras ef_alta:**
```
nombre, telefono, whatsapp, signo, contenido_preferido, pais, fuente,
tipo_suscripcion='premium', estado_suscripcion='pendiente_autorizacion',
acepto_politicas=true, ip_consentimiento, user_agent, fecha_consentimiento
```

**Campos creados en `suscripciones` tras ef_crear_suscripcion:**
```
id_suscriptor, preapproval_id (MP), preapproval_status='pending',
init_point, monto, estado_suscripcion_local='pendiente_autorizacion'
```

> Reutilización TTL: si ya existe una suscripción pendiente < 24h para este suscriptor, se devuelve el mismo `init_point` sin crear duplicado en MP.

---

## Paso 2 — Pago en Mercado Pago (sandbox)

El usuario es redirigido a `init_point` (sandbox URL de MP).
En sandbox, aprueba el pago manualmente en el panel MP developer.

**Variables de entorno relevantes:**
- `MP_ENV=sandbox` — la EF usa credenciales sandbox
- `SANDBOX_AUTOMATIC=false` — el handlePayment NO procesa pagos en sandbox automáticamente a menos que reciba señal explícita

---

## Paso 3 — Webhook preapproval (MP → EF)

**Endpoint Supabase:** `POST {SUPABASE_URL}/functions/v1/ef_webhook_mp?topic=preapproval&id={preapproval_id}`

**Headers requeridos:**
```
Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}
x-internal-key: {WHATSAPP_INTERNAL_KEY}
Content-Type: application/json
```

**Qué hace `handlePreapproval`:**
1. Fetch real al MP API para obtener el preapproval actual
2. Mapea `status`:
   - `authorized` → `estado_suscripcion=activa`, `premium_activo=true`, `preapproval_status=authorized`
   - `paused` → `estado_suscripcion=suspendida`, `preapproval_status=paused`
   - `cancelled` → `estado_suscripcion=cancelada_no_renueva`, `preapproval_status=cancelled`
3. Actualiza `suscripciones` y `suscriptores`

> La EF responde 200 OK inmediatamente (fire-and-forget). `handlePreapproval` corre sin await.

---

## Paso 4 — Webhook payment (MP → EF) — ACTIVACIÓN REAL

**Endpoint Supabase:** `POST {SUPABASE_URL}/functions/v1/ef_webhook_mp`

**Para sandbox (SANDBOX_AUTOMATIC=false), se requiere UNO de:**
- Header `x-manual-test: true` en el request
- Query param `topic=payment_trigger` (activa mock sin ir a MP)

**Body para simular pago real:**
```json
{
  "type": "payment",
  "data": { "id": "{payment_id_de_mp_sandbox}" }
}
```

**Alternativa IPN (query string):**
```
?topic=payment&id={payment_id_de_mp_sandbox}
```

**Qué hace `handlePayment`:**
1. Sleep 5s (anti race condition)
2. Fetch pago desde MP API (o mock si sandbox + manual-test)
3. Upsert en `pagos`
4. Activa premium en `suscriptores`
5. Calcula `fecha_vencimiento_premium` (30 días desde hoy UTC)
6. Si `bienvenida_enviada !== true`:
   - Inserta en `mensajes_enviados` (template `bienvenida_validacion_numero`)
   - Llama `ef_whatsapp_sender` (express, inmediato)
   - Marca `suscriptores.bienvenida_enviada = true`
7. Marca `pagos.procesado = true`

> `bienvenida_enviada` es el flag canónico para la primera activación. `premium_activo` no se usa como detector de primer pago porque puede cambiar por renovaciones.

---

## Paso 5 — Usuario recibe WhatsApp de bienvenida

Template enviado: `bienvenida_validacion_numero`
(resuelto desde tabla `plantillas` donde `nombre='bienvenida_validacion_numero'` y `contenido='{nombre_real_template_meta}'`)

El mensaje instruye al usuario a responder para confirmar su número.

---

## Paso 6 — Usuario responde → Confirmación de número

**Flujo en `ef_webhook_whatsapp_inbound`:**

Cualquier mensaje que no sea "BAJA" desencadena la confirmación, pero SOLO si:
- `tipo_suscripcion = 'premium'` Y `estado_suscripcion = 'activa'`
- `whatsapp_confirmado = false`
- La bienvenida ya fue enviada (gate via `mensajes_enviados`)

**Acciones al confirmar:**
1. `suscriptores`: `whatsapp_confirmado=true`, `fecha_confirmacion_whatsapp=now`
2. Resuelve plantilla real `confirmacion_numero_ok` desde tabla `plantillas`
3. Encola en `mensajes_enviados` (tipo=operativo, nombre_plantilla=real)
4. Llama `ef_whatsapp_sender` → envía template de confirmación
5. Si sender OK → `dispararGeneracionOnDemand(id_suscriptor)` → llama `ef_genera_guarda_contenido_premium`

**Comandos especiales reconocidos:**
| Texto | Acción |
|-------|--------|
| BAJA | Pausa mensajes (estado_mensaje='pausado_usuario'), encola plantilla baja_info_mp o baja_thc |
| ALTA / ACTIVAR / REACTIVAR / VOLVER | Reactiva mensajes (estado_mensaje='activo'). No toca MP. |
| AYUDA | Encola plantilla ayuda_usuario |
| ESTADO | Encola plantilla estado_usuario |

---

## Paso 7 — Generación de contenido premium (on-demand)

**EF:** `ef_genera_guarda_contenido_premium` con body `{ id_suscriptor: N }`

**Qué hace:**
1. Carga suscriptor (signo, contenido_preferido, nombre)
2. Selecciona emoción aleatoria de `emocion_dominante`
3. Resuelve `color_base` desde `paleta_colores` (por grupo de emoción)
4. Resuelve `numero_base` desde `rango_numeros` (por grupo de emoción)
5. Lee plantilla `prompt_contenido_premium` de tabla `plantillas`
6. Reemplaza placeholders: `{{signo}}`, `{{fecha}}`, `{{emocion_dominante}}`, `{{contenido_preferido}}`, `{{nombre}}`, `{{color}}`, `{{numero}}`
7. Llama `ef_openia_genera_contenido_premium` (ANON KEY) → recibe JSON con `horoscopo`, `frase`, `numero_suerte`, `color_suerte`, etc.
8. Persiste en `contenido_premium` via `ef_alta_contenido_premium` (ANON KEY)
   - `fecha_envio_programada = now + 2 min` (modo on-demand)

---

## Paso 8 — Envío del primer contenido premium

**EF:** `ef_envio_premium_post_confirmacion` con body `{ id_suscriptor: N }`

> **Nota:** Esta EF es invocada por `ef_genera_guarda_contenido_premium` en el flujo on-demand. También corre como CRON para usuarios con `primer_envio_premium_enviado=false` y `fecha_confirmacion_whatsapp` >= 5 min atrás.

**Pipeline completo (modo on-demand):**
1. Acquiere advisory lock `pg_advisory_lock(id_suscriptor)`
2. Valida elegibilidad: `premium_activo=true`, `whatsapp_confirmado=true`, tiene `whatsapp`
3. Si `primer_envio_premium_enviado=true` y no hay `force`, skip
4. Encola `primer_mensaje_premium` (template) + dispara sender
5. Llama EF generadora (diario o domingo según día UTC)
6. Obtiene contenido generado de `contenido_premium`
7. Renderiza cuerpo: concatena horoscopo + frase + numero + color + ritual
8. Encola mensaje premium (`tipo_mensaje=premium`, `nombre_plantilla=null`, `cuerpo` en `metadata.variables.cuerpo`)
9. Dispara sender → WhatsApp Cloud API
10. Si sender OK → `suscriptores.primer_envio_premium_enviado=true`

---

## Tablas involucradas

| Tabla | Rol en el flujo |
|-------|----------------|
| `suscriptores` | Estado central del usuario: premium_activo, whatsapp_confirmado, bienvenida_enviada, primer_envio_premium_enviado |
| `suscripciones` | Registro de la suscripción MP: preapproval_id, preapproval_status |
| `pagos` | Registro de cada cobro: id_pago_mp, monto, procesado |
| `mensajes_enviados` | OUTBOX: todos los mensajes encolados y su estado de entrega |
| `contenido_premium` | Contenido generado por OpenAI para enviar al usuario |
| `plantillas` | Mapeo clave_logica → nombre_real_template_meta (y prompts para OpenAI) |
| `log_funciones` | Trazabilidad de cada EF: resultado, exito, detalle JSONB |
| `emocion_dominante` | Emociones con grupo para personalizar contenido |
| `paleta_colores` | Colores por grupo de emoción |
| `rango_numeros` | Rangos numéricos por grupo de emoción |

---

## Edge Functions involucradas

| EF | Trigger | Rol |
|----|---------|-----|
| `ef_alta_suscriptor_premium` | `POST /api/iniciar-checkout` | Crea/actualiza suscriptor |
| `ef_crear_suscripcion` | `POST /api/iniciar-checkout` | Crea preapproval en MP |
| `ef_webhook_mp` | Webhook MP (preapproval + payment) | Activa premium, maneja pagos |
| `ef_whatsapp_sender` | Llamado interno por varias EFs | Ejecuta envío real a WhatsApp Cloud API |
| `ef_webhook_whatsapp_inbound` | Webhook WhatsApp inbound | Procesa respuesta del usuario, confirma número |
| `ef_genera_guarda_contenido_premium` | On-demand (inbound) + CRON diario | Genera contenido con OpenAI |
| `ef_envio_premium_post_confirmacion` | On-demand (post-confirmación) + CRON | Envía primer contenido premium |
| `ef_enviar_whatsapp_bienvenida_premium` | (legacy / alternativo) | Envía bienvenida con texto generado por GPT (no template) |

> **Nota:** `ef_webhook_suscripcion` es una versión legacy/inicial del webhook de MP. El flujo activo usa `ef_webhook_mp` (V18 full router).

---

## Variables de entorno críticas para testing

| Variable | Usado en | Descripción |
|----------|----------|-------------|
| `SUPABASE_URL` | Todas | URL base del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas las EF con permisos admin | JWT service role |
| `SUPABASE_ANON_KEY` / `ANON_KEY_SUPABASE` | EFs llamadas con ANON | JWT anon para verify_jwt |
| `WHATSAPP_INTERNAL_KEY` | Calls inter-EF | Header x-internal-key de seguridad |
| `WHATSAPP_TOKEN` | ef_whatsapp_sender | Token de WhatsApp Cloud API |
| `WHATSAPP_PHONE_NUMBER_ID` | ef_whatsapp_sender | Phone Number ID de la cuenta WA |
| `MERCADOPAGO_ACCESS_TOKEN` | ef_webhook_mp, ef_crear_suscripcion | Token MP (sandbox o prod) |
| `APP_ENV` | ef_envio_premium_post_confirmacion | 'sandbox' o 'production' |
| `SANDBOX_AUTOMATIC` | ef_webhook_mp | Si=false, necesita x-manual-test para procesar en sandbox |

---

## Flags de estado en `suscriptores` (semáforos del flujo)

| Campo | Valores | Significado |
|-------|---------|-------------|
| `premium_activo` | true/false | Si el usuario tiene premium activo actualmente |
| `estado_suscripcion` | pendiente_autorizacion, activa, suspendida, cancelada_no_renueva, finalizada | Estado del ciclo de vida |
| `whatsapp_confirmado` | true/false | Si el usuario respondió el WhatsApp de bienvenida |
| `bienvenida_enviada` | true/false | Flag canónico de primera activación — evita reenviar bienvenida en renovaciones |
| `primer_envio_premium_enviado` | true/false | Si el primer contenido premium ya fue enviado exitosamente |
| `estado_mensaje` | activo, pausado_usuario | Si el usuario puede recibir mensajes automáticos |

---

## Puntos de atención para el test E2E

1. **SANDBOX_AUTOMATIC=false** — el handlePayment no procesa en sandbox sin señal. Siempre enviar `x-manual-test: true` en el webhook manual.

2. **bienvenida_enviada como gate** — si este flag ya es `true` (por un test anterior), handlePayment no enviará la bienvenida de nuevo. Resetear antes de cada test.

3. **Advisory locks** — `ef_envio_premium_post_confirmacion` usa `pg_advisory_lock(id_suscriptor)`. Si el proceso anterior quedó colgado, el lock puede bloquear. Un restart de la conexión de Supabase lo libera.

4. **Plantillas deben existir en DB** — Los nombres reales de los templates Meta deben estar en la tabla `plantillas`. Si falta una entrada, la EF falla con log `_plantilla_no_encontrada`.

5. **WhatsApp Cloud API en sandbox** — Los mensajes se envían realmente al número registrado. Usar número de test (no un número real de usuario).

6. **Deduplicación** — `ef_envio_premium_post_confirmacion` tiene dedupe por `id_contenido` en `mensajes_enviados`. Si ya existe un mensaje `pendiente/enviado/delivered/read` para ese contenido, no lo duplica.
