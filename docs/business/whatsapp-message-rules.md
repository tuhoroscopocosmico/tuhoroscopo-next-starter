# WhatsApp Message Rules — Estructura y reglas de mensajes

## Plantillas aprobadas en Meta

Las plantillas de WhatsApp están registradas en la tabla `plantillas` de Supabase. Cada fila tiene:
- `nombre` — nombre lógico interno (lo que usa el código)
- `contenido` — nombre real de la plantilla aprobada en Meta (lo que va en la API call)
- `canal` — siempre `whatsapp`
- `activo` — si está disponible para uso

**No usar nombres de plantillas hardcodeados en código.** El sender (`ef_whatsapp_sender`) resuelve el nombre Meta desde la tabla `plantillas` usando el nombre lógico.

---

## Plantillas conocidas (por nombre lógico)

| Nombre lógico | Propósito |
|---|---|
| `bienvenida_validacion_numero` | Primer mensaje post-pago; pide al usuario que confirme su número respondiendo |
| `confirmacion_numero_ok` | Confirma que el número fue registrado exitosamente |
| `primer_mensaje_premium` | Encabezado del primer envío de contenido premium |
| `baja_info_mp` | Info sobre cómo dar de baja desde MP (cuando tiene preapproval activo) |
| `baja_thc` | Confirmación de pausa de mensajes (cuando no hay preapproval activo) |
| `ayuda_usuario` | Respuesta al comando AYUDA |
| `estado_usuario` | Respuesta al comando ESTADO |
| `prompt_contenido_premium` | Prompt para OpenAI (no es una plantilla WA; es interno) |

**Pendiente de confirmar:** Los nombres reales aprobados en Meta. Leer la tabla `plantillas` en producción para obtener los valores actuales de `contenido`.

---

## Estructura del mensaje premium diario

El contenido generado se guarda en `contenido_premium.contenido` como JSONB. La estructura esperada es:

```json
{
  "saludo_inicial": "Hola [nombre],",
  "horoscopo": "Texto del horóscopo del día...",
  "contenido_preferido": "Sección personalizada según preferencia del usuario (meditación, reflexión, abundancia, amor, etc.)",
  "numero": 7,
  "color": "azul marino",
  "pausa": "Frase breve de pausa o reflexión",
  "pie_de_pagina": "Texto de cierre breve"
}
```

**Campos adicionales registrados en la fila de `contenido_premium`:**
- `emocion_dominante` — emoción del día (viene de tabla `emocion_dominante`)
- `color` — color asociado (viene de `paleta_colores` según grupo emocional)
- `numero` — número de suerte (viene de `rango_numeros` según grupo emocional)
- `tipo` — `diario` o `domingo`
- `ciclo_semana` — pendiente de confirmar estructura exacta

---

## Estructura del mensaje de domingo

El mensaje de domingo es distinto al diario. Generado por `ef_genera_guarda_contenido_premium_domingo`.

Enfoque: pausa semanal, balance, reflexión, intención para la semana.

Puede incluir:
- balance de la semana
- intención para la semana siguiente
- ritual simple o acción concreta
- frase de domingo
- color de la semana
- número de la semana
- desafío cósmico (tabla `desafios_cosmicos`)

**Pendiente de confirmar:** La estructura JSON exacta del contenido de domingo. Leer `ef_openia_genera_contenido_premium_domingo` para el prompt actual.

---

## Reglas de tono

- **Breve** — WhatsApp se lee en el móvil; el texto debe entrar en pantalla sin scrollear excesivamente.
- **Cálido** — como un mensaje de alguien que te conoce.
- **Claro** — una idea principal, sin ambigüedades.
- **Rioplatense moderado** — natural, no forzado. Tuteo ("te", "tu").
- **Sin misticismo exagerado** — no "el universo te habla", sino "hoy es buen momento para X".
- **Accionable** — siempre deja algo concreto: una reflexión, una acción, una frase.
- **Sin promesas vacías** — no predecir eventos específicos ni garantizar resultados.

---

## Flujo de confirmación de WhatsApp

1. MP aprueba pago → `ef_webhook_mp` encola `bienvenida_validacion_numero` en `mensajes_enviados`.
2. `ef_whatsapp_sender` envía el mensaje al usuario.
3. El usuario responde cualquier texto (excepto "BAJA").
4. `ef_webhook_whatsapp_inbound` recibe el mensaje → actualiza `suscriptores.whatsapp_confirmado=true`.
5. Se encola `confirmacion_numero_ok` → se envía confirmación.
6. Se dispara generación de contenido on-demand + primer envío.

Ver detalle completo en `docs/flows/whatsapp-confirmation-flow.md`.

---

## Comandos disponibles para el usuario

| Mensaje del usuario | Respuesta del sistema |
|---|---|
| Cualquier texto (excepto BAJA) | Confirma el número si no estaba confirmado; si ya estaba, se ignora |
| "BAJA" | Pausa mensajes (`estado_mensaje=pausado_usuario`); encola template info_baja |
| "ALTA" / "ACTIVAR" / "REACTIVAR" / "VOLVER" | Reactiva mensajes (`estado_mensaje=activo`) |
| "AYUDA" | Encola template `ayuda_usuario` |
| "ESTADO" | Encola template `estado_usuario` |

**Rate limit BAJA:** Máximo 1 por 24 horas para evitar spam.

---

## Numeración de mensajes y anti-duplicados

- Cada mensaje enviado queda registrado en `mensajes_enviados` con `mensaje_id_whatsapp` (WAMID de Meta).
- El WAMID se guarda también en `contenido_premium.mensaje_id_whatsapp`.
- El outbox tiene idempotencia por `id_contenido` — no se crea un segundo mensaje para el mismo contenido.

---

## BAJA y pausa

La BAJA desde WhatsApp **no cancela la suscripción en Mercado Pago**. Solo pausa el envío de mensajes (`estado_mensaje=pausado_usuario`).

Para cancelar la suscripción en MP, el usuario debe hacerlo directamente en la plataforma de MP. El panel admin NO implementa cancelación de MP (riesgo, fuera de scope actual).

---

## Restricciones de envío (WhatsApp Cloud API)

- Solo se pueden enviar templates aprobados por Meta si el usuario no inició la conversación en las últimas 24h.
- Si el usuario envió un mensaje en las últimas 24h, se puede responder con texto libre (no template).
- El sistema siempre usa templates para los envíos automatizados — no usa texto libre.
- **Pendiente de confirmar:** El sistema actual maneja ventana de 24h de WhatsApp de forma automática o manual.
