# Pruebas: Menú WhatsApp — Sprint 1

**Alcance:** Mostrar menú principal y salir con 0.  
**Opciones 1–4:** responden "próximamente" (sin lógica real todavía).  
**No incluye:** cambiar enfoque, estado, pausar/reactivar, horario.

---

## Precondiciones

Antes de probar, verificar en la tabla `suscriptores`:

```sql
SELECT
  id,
  nombre,
  whatsapp,
  tipo_suscripcion,
  estado_suscripcion,
  premium_activo,
  whatsapp_confirmado,
  estado_mensaje,
  menu_state,
  menu_state_updated_at
FROM suscriptores
WHERE whatsapp = '+598XXXXXXXXX';  -- número de prueba
```

El usuario de prueba debe tener:

| Campo | Valor requerido |
|---|---|
| `tipo_suscripcion` | `premium` |
| `estado_suscripcion` | `activa` |
| `premium_activo` | `true` |
| `whatsapp_confirmado` | `true` |
| `estado_mensaje` | `activo` |
| `menu_state` | `null` (estado inicial) |

Además, las siguientes plantillas deben existir en la tabla `plantillas`:

| `nombre` (lógico) | `contenido` (nombre real en Meta) | Propósito |
|---|---|---|
| `menu_principal` | (nombre aprobado en Meta) | Muestra las 4 opciones del menú |
| `menu_salir` | (nombre aprobado en Meta) | Confirmación de salida |
| `menu_timeout` | (nombre aprobado en Meta) | Avisa que el menú expiró |
| `menu_proximamente` | (nombre aprobado en Meta) | Opción no disponible aún |
| `menu_principal_invalido` | (nombre aprobado en Meta) | Input fuera de rango |

---

## Casos de prueba

### Caso 1 — Usuario escribe MENU

**Input:** `MENU` (también aceptados: `MENÚ`, `CONFIG`, `AJUSTES`, `PREFERENCIAS`)

**Resultado esperado:**
- `suscriptores.menu_state = 'menu_principal'`
- `suscriptores.menu_state_updated_at` actualizado a ahora
- Nueva fila en `mensajes_enviados` con `nombre_plantilla = 'menu_principal'` y `estado = 'pendiente'` o `'enviado'`
- Log en `log_funciones` con `resultado = 'menu_principal_mostrado'` y `exito = true`
- El usuario recibe por WhatsApp el mensaje del menú principal

---

### Caso 2 — Usuario escribe 0 (salir)

**Precondición:** el usuario está en `menu_state = 'menu_principal'`

**Input:** `0`

**Resultado esperado:**
- `suscriptores.menu_state = null`
- `suscriptores.menu_state_updated_at` actualizado
- Nueva fila en `mensajes_enviados` con `nombre_plantilla = 'menu_salir'`
- Log con `resultado = 'menu_salir'` y `exito = true`
- El usuario recibe mensaje de salida

---

### Caso 3 — Usuario escribe 1, 2, 3 o 4 (opciones MVP)

**Precondición:** el usuario está en `menu_state = 'menu_principal'`

**Input:** `1` (o `2`, `3`, `4`)

**Resultado esperado:**
- `suscriptores.menu_state` permanece `'menu_principal'` (el usuario puede seguir navegando)
- `suscriptores.menu_state_updated_at` actualizado (keepalive del timeout)
- Nueva fila en `mensajes_enviados` con `nombre_plantilla = 'menu_proximamente'`
- Log con `resultado = 'menu_opcion_proximamente'` y `exito = true`
- El usuario recibe mensaje "Esta opción estará disponible próximamente"

---

### Caso 4 — Input inválido dentro del menú

**Precondición:** el usuario está en `menu_state = 'menu_principal'`

**Input:** `hola` / `5` / cualquier cosa que no sea 0-4 ni trigger de menú

**Resultado esperado:**
- `menu_state` no cambia
- `menu_state_updated_at` actualizado
- Nueva fila en `mensajes_enviados` con `nombre_plantilla = 'menu_principal_invalido'`
- Log con `resultado = 'menu_opcion_invalida'`

---

### Caso 5 — Timeout (menú expirado)

**Precondición:** el usuario tiene `menu_state = 'menu_principal'` y `menu_state_updated_at` es hace más de 10 minutos

**Input:** cualquier mensaje

**Resultado esperado:**
- `suscriptores.menu_state = null`
- `suscriptores.menu_state_updated_at` actualizado
- Nueva fila en `mensajes_enviados` con `nombre_plantilla = 'menu_timeout'`
- Log con `resultado = 'menu_timeout_reset'`

Para simular: actualizar manualmente `menu_state_updated_at` a hace más de 10 minutos:
```sql
UPDATE suscriptores
SET menu_state = 'menu_principal',
    menu_state_updated_at = NOW() - INTERVAL '15 minutes'
WHERE whatsapp = '+598XXXXXXXXX';
```

---

### Caso 6 — BAJA sigue funcionando independientemente del menú

**Precondición:** el usuario puede estar en `menu_state = 'menu_principal'` o fuera del menú

**Input:** `BAJA`

**Resultado esperado:**
- La lógica de BAJA del inbound actúa normalmente (sección 6)
- `estado_mensaje = 'pausado_usuario'`
- Se encola template `baja_info_mp` o `baja_thc` según estado MP
- `menu_state` NO se limpia (el timeout de 10 minutos lo hará después)
- Log con `resultado` relacionado a BAJA

---

### Caso 7 — Usuario NO confirmado escribe MENU

**Precondición:** `whatsapp_confirmado = false`

**Input:** `MENU`

**Resultado esperado:**
- El menú NO se activa
- Log con `resultado = 'menu_ignorado_no_confirmado'`
- El texto "MENU" es tratado como mensaje normal de confirmación de WhatsApp
- Si el usuario es premium activo, se confirma su número y se encola `confirmacion_numero_ok`

---

### Caso 8 — Usuario escribe MENU fuera del menú (re-trigger)

**Precondición:** `menu_state = null` (o `menu_state = 'menu_principal'`)

**Input:** `MENU`

**Resultado esperado:**
- Se muestra el menú principal
- `menu_state = 'menu_principal'`
- Funciona igual que el Caso 1

---

## Cómo probar desde Postman

### Simular mensaje entrante de Meta hacia ef_webhook_whatsapp_events

**Endpoint:** `POST {SUPABASE_URL}/functions/v1/ef_webhook_whatsapp_events`

**Headers:**
```
Content-Type: application/json
```

**Body (simulando usuario escribiendo MENU):**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "ENTRY_ID",
      "changes": [
        {
          "field": "messages",
          "value": {
            "messaging_product": "whatsapp",
            "metadata": {
              "phone_number_id": "TU_PHONE_NUMBER_ID",
              "display_phone_number": "TU_NUMERO"
            },
            "contacts": [
              {
                "profile": { "name": "Usuario Test" },
                "wa_id": "598XXXXXXXXX"
              }
            ],
            "messages": [
              {
                "id": "wamid.TEST001",
                "from": "598XXXXXXXXX",
                "timestamp": "1747482000",
                "type": "text",
                "text": { "body": "MENU" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

Cambiar `598XXXXXXXXX` por el número de WhatsApp del suscriptor de prueba (sin el `+`).

Para probar "0 salir", cambiar `"body": "MENU"` por `"body": "0"`.

Para probar opciones 1-4, cambiar `"body"` a `"1"`, `"2"`, `"3"` o `"4"`.

---

## Qué revisar después de cada prueba

### En `suscriptores`
```sql
SELECT menu_state, menu_state_updated_at, estado_mensaje, whatsapp_confirmado
FROM suscriptores
WHERE whatsapp = '+598XXXXXXXXX';
```

### En `mensajes_enviados`
```sql
SELECT id, tipo_mensaje, nombre_plantilla, estado, fecha_creado, metadata
FROM mensajes_enviados
WHERE id_suscriptor = <ID>
ORDER BY fecha_creado DESC
LIMIT 5;
```

### En `log_funciones`
```sql
SELECT nombre_funcion, resultado, exito, detalle, fecha_ejecucion
FROM log_funciones
WHERE nombre_funcion IN ('ef_webhook_whatsapp_inbound', 'ef_orquesta_menu_respuesta')
ORDER BY fecha_ejecucion DESC
LIMIT 20;
```

### En `whatsapp_webhook_events`
```sql
SELECT id, tipo_evento, from_number, processing_status, inbound_called, inbound_http_status
FROM whatsapp_webhook_events
ORDER BY received_at_utc DESC
LIMIT 5;
```

---

## Plantillas Meta que deben existir antes de producción

| Nombre lógico | Propósito | Variables esperadas |
|---|---|---|
| `menu_principal` | Menú con 4 opciones | `{{1}}` = nombre del usuario |
| `menu_salir` | Confirmación de salida | `{{1}}` = nombre del usuario |
| `menu_timeout` | Sesión expirada | `{{1}}` = nombre del usuario |
| `menu_proximamente` | Opción no disponible | `{{1}}` = nombre del usuario |
| `menu_principal_invalido` | Input fuera de rango | `{{1}}` = nombre del usuario |

**Texto sugerido para `menu_principal`:**
```
⚙️ Ajustes Premium

1) Cambiar enfoque
2) Estado de mi suscripción
3) Pausar / reactivar mensajes
4) Ayuda
0) Salir

Respondé con un número.
```

**Texto sugerido para `menu_salir`:**
```
¡Hasta la próxima, {{1}}! Cuando quieras volver, escribí MENU.
```

**Texto sugerido para `menu_timeout`:**
```
Tu sesión del menú expiró, {{1}}. Si querés volver a acceder, escribí MENU.
```

**Texto sugerido para `menu_proximamente`:**
```
Esta opción estará disponible próximamente. Seguís en el menú — escribí 0 para salir.
```

**Texto sugerido para `menu_principal_invalido`:**
```
Por favor respondé con un número del 0 al 4. Escribí 0 para salir.
```

---

## SQL de reset del usuario de prueba (para repetir tests)

```sql
UPDATE suscriptores
SET
  menu_state = NULL,
  menu_state_updated_at = NULL,
  estado_mensaje = 'activo'
WHERE whatsapp = '+598XXXXXXXXX';
```
