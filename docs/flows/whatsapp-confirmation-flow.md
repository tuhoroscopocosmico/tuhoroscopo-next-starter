# WhatsApp Confirmation Flow

Este documento describe el flujo de confirmación del número de WhatsApp de un suscriptor premium.

---

## Cuándo se dispara

El flujo de confirmación se inicia cuando:
1. MP procesa el primer pago de un suscriptor (`ef_webhook_mp`, `topic=payment`).
2. `bienvenida_enviada=false` para ese suscriptor.

Si `bienvenida_enviada=true` (renovación mensual, por ejemplo), no se reenvía la bienvenida.

---

## Paso 1: Encolar mensaje de bienvenida

**Quién:** `ef_webhook_mp` (al procesar pago aprobado)

**Qué hace:**
1. Inserta en `mensajes_enviados`:
   - `tipo_mensaje = 'bienvenida_validacion_numero'`
   - `estado = 'pendiente'`
   - `id_suscriptor` del suscriptor
   - `whatsapp_destino` del suscriptor
2. Actualiza `suscriptores.bienvenida_enviada = true`.

---

## Paso 2: Envío del mensaje de bienvenida

**Quién:** `ef_run_sender_batch` (CRON, cada pocos minutos) → `ef_whatsapp_sender`

**Qué hace:**
1. `ef_run_sender_batch` detecta mensajes con `estado=pendiente`.
2. Para cada uno, llama `ef_whatsapp_sender` con `{ id_mensaje }`.
3. `ef_whatsapp_sender`:
   - Resuelve nombre real del template desde `plantillas[nombre='bienvenida_validacion_numero']`.
   - Llama WhatsApp Cloud API.
   - Actualiza `mensajes_enviados.estado = 'enviado'`, guarda `mensaje_id_whatsapp`.

**Mensaje al usuario:** Template de bienvenida que explica el servicio y pide al usuario que responda para confirmar su número.

**Timing:** El usuario recibe este mensaje en minutos tras el pago aprobado (depende de la frecuencia del sender batch y del webhook de MP).

---

## Paso 3: El usuario responde

El usuario escribe cualquier mensaje en el chat de WhatsApp de THC.

**Regla:** Cualquier mensaje (excepto "BAJA") dispara la confirmación si `premium_activo=true`.

---

## Paso 4: Procesamiento del mensaje entrante

**Quién:** `ef_webhook_whatsapp_inbound` (llamado por Meta Webhook)

**Qué hace:**
1. Meta envía el mensaje entrante al endpoint del webhook de WA de THC.
2. La EF identifica el suscriptor por `whatsapp` (número del remitente).
3. Verifica:
   - `premium_activo = true`
   - Mensaje ≠ "BAJA"
   - `whatsapp_confirmado = false` (aún no confirmado)
4. Actualiza:
   - `suscriptores.whatsapp_confirmado = true`
   - `suscriptores.fecha_confirmacion_whatsapp = now()`
5. Registra en `log_funciones`.

---

## Paso 5: Acciones post-confirmación

Inmediatamente después de confirmar, la EF encadena:

**a) Encolar confirmación:**
- Inserta en `mensajes_enviados`: template `confirmacion_numero_ok`.
- El usuario recibe un mensaje confirmando que su número fue registrado.

**b) Generar contenido on-demand:**
- Llama `ef_genera_guarda_contenido_premium` con `{ id_suscriptor, modo: 'ON_DEMAND' }`.
- Se genera el primer horóscopo del día (o del día siguiente si es muy tarde).
- Se inserta en `contenido_premium` con `fecha_envio_programada = now() + 2min`.

**c) Enviar primer contenido premium:**
- Llama `ef_envio_premium_post_confirmacion`.
- Encola en `mensajes_enviados`:
  - Template `primer_mensaje_premium` (encabezado del primer envío).
  - Cuerpo del contenido premium.
- Actualiza `suscriptores.primer_envio_premium_enviado = true`.
- Actualiza `suscriptores.fecha_primer_envio_premium = now()`.

---

## Flags que cambian durante el flujo

| Evento | `bienvenida_enviada` | `whatsapp_confirmado` | `primer_envio_premium_enviado` |
|---|---|---|---|
| Antes del pago | false | false | false |
| Post-pago (bienvenida encolada) | true | false | false |
| Usuario responde | true | true | false |
| Primer contenido enviado | true | true | true |

---

## Casos especiales

### El usuario no responde
Si el usuario no responde al mensaje de bienvenida:
- `whatsapp_confirmado` permanece `false`.
- El suscriptor NO entra al pipeline de contenido diario.
- El admin puede ver este estado en `/admin/suscriptores` (alerta: `suscripcion_activa_sin_wa_confirmado`).
- **No hay reenvío automático de la bienvenida** (pendiente de confirmar si hay algún cron de recordatorio).

### El usuario escribe "BAJA" como primer mensaje
- No se confirma el número.
- Se encola template de baja.
- Rate limit: 1 por 24h para evitar spam.

### Renovación mensual (pago posterior)
- `bienvenida_enviada=true` → no se reenvía la bienvenida.
- La confirmación ya fue hecha en el alta inicial.
- El suscriptor ya está en el pipeline de cron diario.

### Número de WA no encontrado en la DB
- `ef_webhook_whatsapp_inbound` no puede identificar al suscriptor.
- El evento queda registrado en `whatsapp_webhook_events` con `processing_status=unmatched`.
- No se toma ninguna acción.

---

## Webhook de WhatsApp (setup)

Para que los mensajes entrantes lleguen a `ef_webhook_whatsapp_inbound`:
- Meta debe tener configurado el webhook URL de la EF.
- El verificación token de Meta debe coincidir con el configurado en la EF.
- El número de WhatsApp Business debe estar registrado en `WHATSAPP_PHONE_NUMBER_ID`.

**Pendiente de confirmar:** La URL exacta del webhook y el proceso de verificación inicial.
