# Premium E2E Flow — Flujo completo de suscripción premium

Este documento describe el flujo completo desde que un usuario llega a la landing hasta que recibe su primer mensaje de contenido premium.

---

## Diagrama de alto nivel

```
Landing → Checkout → MP Preapproval → Webhook preapproval → Webhook pago
→ Bienvenida WA → Confirmación usuario → Generación contenido → Primer envío premium
→ Cron diario (a partir del día siguiente)
```

---

## Paso 1: Alta del suscriptor (Checkout)

**Ruta:** `/checkout` (o `/checkout2`)  
**Archivo:** `app/checkout/page.tsx`

El usuario completa el formulario:
- `nombre`, `telefono`, `whatsapp`, `signo`, `contenido_preferido`
- `codigo_descuento` (opcional — se valida en tiempo real vía `/api/validar-codigo`)
- `acepto_politicas` (obligatorio)

**POST `/api/iniciar-checkout`** (`app/api/iniciar-checkout/route.ts`):
1. Llama `ef_alta_suscriptor_premium` → crea/actualiza fila en `suscriptores`.
   - Normaliza WhatsApp: `09XXXXXXXX` → `+5989XXXXXXXX`
   - Retorna `id_suscriptor`.
2. Llama `ef_crear_suscripcion` → crea preapproval en MP.
   - Si ya tiene preapproval pendiente de < 24h: reutiliza.
   - Retorna `init_point` (URL de pago MP).
3. Frontend redirige al usuario a `init_point`.

**Estado al final de este paso:**
- `suscriptores`: fila creada con `estado_suscripcion=pendiente_autorizacion`, `premium_activo=false`.
- `suscripciones`: fila creada con `estado=pendiente_autorizacion`, `provisional=true`.

---

## Paso 2: Pago en Mercado Pago

El usuario paga en la plataforma de Mercado Pago. No hay intervención del sistema THC en este paso.

MP envía dos webhooks al sistema:
1. `topic=preapproval` — cuando el contrato es autorizado.
2. `topic=payment` — cuando el pago es aprobado.

**Endpoint:** MP llama directamente a `ef_webhook_mp` (URL configurada en MP).

---

## Paso 3: Webhook de preapproval

**Edge Function:** `ef_webhook_mp` (`topic=preapproval`)

1. Consulta MP API para verificar el estado actual del preapproval.
2. Si `status=authorized`:
   - `suscriptores.premium_activo = true`
   - `suscriptores.estado_suscripcion = activa`
   - `suscriptores.preapproval_status = authorized`
   - `suscripciones.preapproval_status_mp = authorized`
   - `suscripciones.provisional = false`
3. Registra en `log_funciones`.

---

## Paso 4: Webhook de pago

**Edge Function:** `ef_webhook_mp` (`topic=payment`)

1. Verifica el pago via MP API.
2. Crea fila en `pagos` con `status=approved`.
3. Si `bienvenida_enviada=false`:
   - Encola mensaje `bienvenida_validacion_numero` en `mensajes_enviados`.
   - Actualiza `suscriptores.bienvenida_enviada = true`.
4. Si hay descuento pendiente: llama `ef_aplicar_codigo_descuento`.
5. Registra en `log_funciones`.

**Estado al final de este paso:**
- `pagos`: fila con `status=approved`.
- `mensajes_enviados`: fila con `tipo_mensaje=bienvenida_validacion_numero`, `estado=pendiente`.
- `suscriptores.bienvenida_enviada = true`.

---

## Paso 5: Envío de bienvenida por WhatsApp

**Edge Function:** `ef_whatsapp_sender` (llamada desde `ef_run_sender_batch` o directamente)

1. Lee fila de `mensajes_enviados` con `estado=pendiente`.
2. Resuelve template `bienvenida_validacion_numero` desde tabla `plantillas`.
3. Llama WhatsApp Cloud API con el template y el número del usuario.
4. Actualiza `mensajes_enviados.estado = enviado`, guarda `mensaje_id_whatsapp`.

**Mensaje al usuario:** Template de bienvenida que le pide responder para confirmar su número de WhatsApp.

---

## Paso 6: Confirmación del usuario

**El usuario responde cualquier mensaje** (excepto "BAJA") al número de WhatsApp de THC.

**Edge Function:** `ef_webhook_whatsapp_inbound`

1. Identifica al suscriptor por número de WA.
2. Si `premium_activo=true` y mensaje ≠ "BAJA":
   - `suscriptores.whatsapp_confirmado = true`
   - `suscriptores.fecha_confirmacion_whatsapp = now()`
3. Encola `confirmacion_numero_ok` en `mensajes_enviados`.
4. Llama `ef_genera_guarda_contenido_premium` on-demand (genera contenido inmediatamente).
5. Llama `ef_envio_premium_post_confirmacion` (encola el primer envío premium).

**Ver detalle:** `docs/flows/whatsapp-confirmation-flow.md`

---

## Paso 7: Generación del primer contenido premium

**Edge Function:** `ef_genera_guarda_contenido_premium` (modo ON_DEMAND)

1. Selecciona emoción aleatoria → grupo emocional.
2. Resuelve color y número desde `paleta_colores` y `rango_numeros`.
3. Carga prompt desde `plantillas[nombre='prompt_contenido_premium']`.
4. Llama `ef_openia_genera_contenido_premium` (OpenAI `gpt-4o-mini`).
5. Inserta en `contenido_premium` con:
   - `tipo = diario`
   - `estado_envio = pendiente`
   - `fecha_envio_programada = now() + 2min`

---

## Paso 8: Envío del primer mensaje premium

**Edge Function:** `ef_envio_premium_post_confirmacion`

1. Encola en `mensajes_enviados`:
   - Template `primer_mensaje_premium` (header del primer envío).
   - Contenido premium del día.
2. Llama `ef_whatsapp_sender` para cada mensaje.
3. Actualiza `suscriptores.primer_envio_premium_enviado = true`.
4. Actualiza `suscriptores.fecha_primer_envio_premium = now()`.
5. Actualiza `contenido_premium.estado_envio = enviado`.

**Estado al final:**
- El usuario recibió su primer horóscopo premium.
- `primer_envio_premium_enviado = true` → entra al pipeline de cron diario.

---

## Paso 9: Flujo diario (desde el día siguiente)

**CRON diario** (`ef_orquesta_envio_contenido_premium` → `ef_genera_guarda_contenido_premium` → `ef_run_encolador_premium` → `ef_run_sender_batch` → `ef_whatsapp_sender`):

1. `ef_genera_guarda_contenido_premium`: genera contenido para todos los suscriptores elegibles (no duplica si ya existe para hoy).
2. `ef_run_encolador_premium`: encola mensajes en `mensajes_enviados`.
3. `ef_run_sender_batch`: procesa outbox y llama `ef_whatsapp_sender` por cada pendiente.

**El sender batch** también corre frecuentemente (cada pocos minutos) para no acumular mensajes.

**Los domingos:** `ef_genera_guarda_contenido_premium_domingo` genera contenido especial.

---

## Flags de estado a lo largo del flujo

| Paso | `premium_activo` | `bienvenida_enviada` | `whatsapp_confirmado` | `primer_envio_premium_enviado` |
|---|---|---|---|---|
| Alta suscriptor | false | false | false | false |
| Webhook preapproval | true | false | false | false |
| Webhook pago | true | true | false | false |
| Confirmación usuario | true | true | true | false |
| Primer envío premium | true | true | true | true |

---

## Variables de entorno necesarias

**Frontend (Vercel):**
- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WHATSAPP_INTERNAL_KEY`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`

**Backend (Supabase EFs):**
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANON_KEY_SUPABASE`
- `WHATSAPP_INTERNAL_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`, `MP_ENV`
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- `APP_ENV` (`sandbox`/`production`)
- `OPENAI_API_KEY`
- `SANDBOX_AUTOMATIC` (true en sandbox para auto-procesar pagos)

---

## Notas de testing

Para probar el flujo E2E en sandbox:
1. Usar `SANDBOX_AUTOMATIC=true` en EF secrets para que MP procese automáticamente.
2. Completar checkout con número de WA real y signo.
3. Verificar en `suscriptores` que los flags avanzan correctamente.
4. Responder al mensaje de bienvenida para confirmar.
5. Verificar `contenido_premium` y `mensajes_enviados`.

**SQL de reset:** `docs/testing/sql-reset-e2e-test-user.sql`
