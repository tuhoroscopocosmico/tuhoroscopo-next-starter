# Pruebas: Menú WhatsApp — MVP completo

**Alcance:** Flujo completo del menú interactivo premium — todas las opciones funcionales.  
**Requiere:** Sprint 1 deployado + plantillas Meta aprobadas + migración aplicada.

---

## Árbol de menú

```
Usuario escribe MENU / CONFIG / AJUSTES / PREFERENCIAS
  └─► menu_principal
        ├─ 1) Cambiar enfoque
        │     └─► menu_enfoque
        │           ├─ 1 → bienestar          → confirma, sale del menú
        │           ├─ 2 → trabajo_dinero     → confirma, sale del menú
        │           ├─ 3 → amor_relaciones    → confirma, sale del menú
        │           ├─ 4 → salud_energia      → confirma, sale del menú
        │           ├─ 0 → vuelve a menu_principal
        │           └─ otro → error, sigue en menu_enfoque
        ├─ 2) Estado de suscripción
        │     └─► respuesta inline, queda en menu_principal
        ├─ 3) Pausar / reactivar
        │     └─► menu_pausa
        │           ├─ 1 → pausar mensajes    → confirma, sale del menú
        │           ├─ 2 → reactivar mensajes → confirma, sale del menú
        │           ├─ 0 → vuelve a menu_principal
        │           └─ otro → error, sigue en menu_pausa
        ├─ 4) Ayuda
        │     └─► respuesta inline (plantilla ayuda_usuario), queda en menu_principal
        ├─ 0) Salir → despedida, menu_state = null
        └─ otro → error, sigue en menu_principal

Timeout: 10 minutos de inactividad → avisa, menu_state = null
```

---

## Plantillas requeridas en Meta

Deben existir en la tabla `plantillas` con el campo `contenido` igual al nombre aprobado en Meta.

| `nombre` lógico | Variables | Propósito |
|---|---|---|
| `menu_principal` | `{{1}}` = nombre | Menú con opciones 1-4 y 0 para salir |
| `menu_salir` | `{{1}}` = nombre | Confirmación de salida completa |
| `menu_timeout` | `{{1}}` = nombre | Sesión expirada por inactividad |
| `menu_principal_invalido` | `{{1}}` = nombre | Input fuera de rango en menú principal |
| `menu_enfoque` | `{{1}}` = nombre, `{{2}}` = enfoque_actual | Sub-menú cambio de enfoque |
| `menu_confirmacion_enfoque` | `{{1}}` = nombre, `{{2}}` = enfoque | Confirma el nuevo enfoque elegido |
| `menu_enfoque_invalido` | `{{1}}` = nombre | Input inválido en sub-menú de enfoque |
| `menu_estado_suscripcion` | `{{1}}` = nombre, `{{2}}` = premium, `{{3}}` = suscripcion, `{{4}}` = mensajes, `{{5}}` = vencimiento | Resumen de estado de la cuenta |
| `menu_pausa` | `{{1}}` = nombre, `{{2}}` = estado_mensajes | Sub-menú pausa/reactivación |
| `menu_pausa_confirmada` | `{{1}}` = nombre | Confirma que los mensajes fueron pausados |
| `menu_reactivacion_confirmada` | `{{1}}` = nombre | Confirma que los mensajes fueron reactivados |
| `menu_pausa_invalido` | `{{1}}` = nombre | Input inválido en sub-menú de pausa |
| `ayuda_usuario` | `{{1}}` = nombre | Ayuda (ya aprobada — se reutiliza) |

### Texto sugerido para cada plantilla

**`menu_principal`**
```
⚙️ Ajustes Premium, {{1}}

1) Cambiar enfoque
2) Estado de mi suscripción
3) Pausar / reactivar mensajes
4) Ayuda
0) Salir

Respondé con un número.
```

**`menu_salir`**
```
¡Hasta la próxima, {{1}}! Escribí MENU cuando quieras volver a los ajustes.
```

**`menu_timeout`**
```
Tu sesión del menú expiró, {{1}}. Si querés volver a acceder, escribí MENU.
```

**`menu_principal_invalido`**
```
Por favor respondé con un número del 0 al 4. Escribí 0 para salir.
```

**`menu_enfoque`**
```
🔭 Cambiar enfoque, {{1}}

Tu enfoque actual: {{2}}

1) Bienestar
2) Trabajo y dinero
3) Amor y relaciones
4) Salud y energía
0) Volver

Respondé con un número.
```

**`menu_confirmacion_enfoque`**
```
✅ ¡Listo, {{1}}! Tu nuevo enfoque es *{{2}}*. A partir del próximo mensaje lo vas a notar. Escribí MENU para más ajustes.
```

**`menu_enfoque_invalido`**
```
Por favor elegí un número del 1 al 4, o 0 para volver.
```

**`menu_estado_suscripcion`**
```
📋 Estado de tu cuenta, {{1}}

• Premium: {{2}}
• Suscripción: {{3}}
• Mensajes: {{4}}
• Vencimiento: {{5}}

Escribí 0 para salir o elegí otra opción.
```

**`menu_pausa`**
```
⏸️ Pausar / reactivar mensajes, {{1}}

Tus mensajes están actualmente *{{2}}*.

1) Pausar mis mensajes
2) Reactivar mis mensajes
0) Volver

Respondé con un número.
```

**`menu_pausa_confirmada`**
```
✅ Listo, {{1}}. Tus mensajes diarios están pausados. Tu suscripción sigue activa. Escribí MENU para volver a activarlos cuando quieras.
```

**`menu_reactivacion_confirmada`**
```
✅ ¡Bienvenido de vuelta, {{1}}! Tus mensajes diarios están activos nuevamente.
```

**`menu_pausa_invalido`**
```
Por favor respondé con 1 para pausar, 2 para reactivar, o 0 para volver.
```

---

## Precondiciones

### Usuario de prueba en `suscriptores`

```sql
SELECT
  id, nombre, whatsapp,
  tipo_suscripcion, estado_suscripcion, premium_activo,
  whatsapp_confirmado, estado_mensaje,
  contenido_preferido, fecha_vencimiento_premium,
  menu_state, menu_state_updated_at
FROM suscriptores
WHERE whatsapp = '+598XXXXXXXXX';
```

| Campo | Valor requerido |
|---|---|
| `tipo_suscripcion` | `premium` |
| `estado_suscripcion` | `activa` |
| `premium_activo` | `true` |
| `whatsapp_confirmado` | `true` |
| `estado_mensaje` | `activo` |
| `menu_state` | `null` (estado inicial) |
| `menu_state_updated_at` | `null` |
| `contenido_preferido` | cualquier valor válido o `null` |
| `fecha_vencimiento_premium` | date válida (e.g. `2026-12-31`) |

### Reset entre tests

```sql
UPDATE suscriptores
SET
  menu_state = NULL,
  menu_state_updated_at = NULL,
  estado_mensaje = 'activo',
  contenido_preferido = 'bienestar'
WHERE whatsapp = '+598XXXXXXXXX';
```

---

## Cómo probar desde Postman

### Endpoint

`POST {SUPABASE_URL}/functions/v1/ef_webhook_whatsapp_events`

### Headers

```
Content-Type: application/json
```

### Body base

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

Cambiar `"body": "MENU"` por el mensaje que se quiere probar.  
Cambiar `wamid.TEST001` por un ID único en cada llamada (evita deduplicación).

---

## Casos de prueba

### Caso 1 — Abrir menú (MENU)

**Input:** `MENU`  
**Resultado esperado:**
- `menu_state = 'menu_principal'`
- `menu_state_updated_at` actualizado
- `mensajes_enviados`: plantilla `menu_principal`
- Log: `resultado = 'menu_principal_mostrado'`, `exito = true`
- El usuario recibe el menú con 4 opciones

---

### Caso 2 — Salir desde menú principal (0)

**Precondición:** `menu_state = 'menu_principal'`  
**Input:** `0`  
**Resultado esperado:**
- `menu_state = null`
- `mensajes_enviados`: plantilla `menu_salir`
- Log: `resultado = 'menu_salir'`

---

### Caso 3 — Opción 1: Cambiar enfoque

**Precondición:** `menu_state = 'menu_principal'`  
**Input:** `1`  
**Resultado esperado:**
- `menu_state = 'menu_enfoque'`
- `mensajes_enviados`: plantilla `menu_enfoque`
- Log: `resultado = 'menu_enfoque_mostrado'`

**Continuación — elegir enfoque:**  
**Input:** `2` (trabajo_dinero)  
**Resultado esperado:**
- `contenido_preferido = 'trabajo_dinero'`
- `menu_state = null`
- `mensajes_enviados`: plantilla `menu_confirmacion_enfoque`
- Log: `resultado = 'menu_enfoque_actualizado'`, `enfoque_nuevo = 'trabajo_dinero'`

**Continuación — volver con 0 desde enfoque:**  
**Precondición:** `menu_state = 'menu_enfoque'`  
**Input:** `0`  
**Resultado esperado:**
- `menu_state = 'menu_principal'`
- `mensajes_enviados`: plantilla `menu_principal`
- Log: `resultado = 'menu_volver'`, `to = 'menu_principal'`

**Continuación — input inválido en enfoque:**  
**Precondición:** `menu_state = 'menu_enfoque'`  
**Input:** `9`  
**Resultado esperado:**
- `menu_state` permanece `'menu_enfoque'`
- `menu_state_updated_at` actualizado
- `mensajes_enviados`: plantilla `menu_enfoque_invalido`
- Log: `resultado = 'menu_enfoque_invalido'`

---

### Caso 4 — Opción 2: Estado de suscripción

**Precondición:** `menu_state = 'menu_principal'`  
**Input:** `2`  
**Resultado esperado:**
- `menu_state` permanece `'menu_principal'`
- `menu_state_updated_at` actualizado (keepalive)
- `mensajes_enviados`: plantilla `menu_estado_suscripcion`
- Variables en `metadata.variables`: `premium`, `suscripcion`, `mensajes`, `vencimiento`
- Log: `resultado = 'menu_estado_suscripcion_mostrado'`

---

### Caso 5 — Opción 3: Pausar mensajes

**Precondición:** `menu_state = 'menu_principal'`, `estado_mensaje = 'activo'`  
**Input:** `3`  
**Resultado esperado:**
- `menu_state = 'menu_pausa'`
- `mensajes_enviados`: plantilla `menu_pausa`
- La variable `estado_mensajes` debe ser `"activos"` (no `"pausados"`)

**Continuación — confirmar pausa:**  
**Input:** `1`  
**Resultado esperado:**
- `estado_mensaje = 'pausado_usuario'`
- `menu_state = null`
- `mensajes_enviados`: plantilla `menu_pausa_confirmada`
- Log: `resultado = 'menu_mensajes_pausados'`, `nota = 'NO_cancela_MP_solo_pausa_mensajes'`
- **Verificar que `premium_activo`, `estado_suscripcion` NO cambiaron**

---

### Caso 6 — Opción 3: Reactivar mensajes

**Precondición:** `menu_state = 'menu_principal'`, `estado_mensaje = 'pausado_usuario'`  
**Input:** `3`  
**Resultado esperado:**
- `menu_state = 'menu_pausa'`
- Variable `estado_mensajes` debe ser `"pausados"`

**Continuación — confirmar reactivación:**  
**Input:** `2`  
**Resultado esperado:**
- `estado_mensaje = 'activo'`
- `menu_state = null`
- `mensajes_enviados`: plantilla `menu_reactivacion_confirmada`
- Log: `resultado = 'menu_mensajes_reactivados'`

**Continuación — volver con 0 desde pausa:**  
**Precondición:** `menu_state = 'menu_pausa'`  
**Input:** `0`  
**Resultado esperado:**
- `menu_state = 'menu_principal'`
- `mensajes_enviados`: plantilla `menu_principal`
- Log: `resultado = 'menu_volver'`, `to = 'menu_principal'`

---

### Caso 7 — Opción 4: Ayuda

**Precondición:** `menu_state = 'menu_principal'`  
**Input:** `4`  
**Resultado esperado:**
- `menu_state` permanece `'menu_principal'`
- `mensajes_enviados`: plantilla `ayuda_usuario`
- Log: `resultado = 'menu_ayuda_mostrada'`

---

### Caso 8 — Input inválido en menú principal

**Precondición:** `menu_state = 'menu_principal'`  
**Input:** `7` / `hola` / `BUEN DIA`  
**Resultado esperado:**
- `menu_state` permanece `'menu_principal'`
- `menu_state_updated_at` actualizado
- `mensajes_enviados`: plantilla `menu_principal_invalido`
- Log: `resultado = 'menu_principal_invalido'`

---

### Caso 9 — Timeout (sesión expirada)

**Precondición:** `menu_state = 'menu_principal'` y hace más de 10 minutos

```sql
UPDATE suscriptores
SET menu_state = 'menu_principal',
    menu_state_updated_at = NOW() - INTERVAL '15 minutes'
WHERE whatsapp = '+598XXXXXXXXX';
```

**Input:** cualquier mensaje  
**Resultado esperado:**
- `menu_state = null`
- `mensajes_enviados`: plantilla `menu_timeout`
- Log: `resultado = 'menu_timeout_reset'`, `menu_state_anterior = 'menu_principal'`

**Variante — timeout en sub-menú:**

```sql
UPDATE suscriptores
SET menu_state = 'menu_enfoque',
    menu_state_updated_at = NOW() - INTERVAL '15 minutes'
WHERE whatsapp = '+598XXXXXXXXX';
```

Mismo resultado: timeout siempre sale completamente, sin importar el sub-menú.

---

### Caso 10 — Re-trigger MENU desde dentro del menú

**Precondición:** `menu_state = 'menu_enfoque'` (usuario a mitad de flujo)  
**Input:** `MENU`  
**Resultado esperado:**
- `menu_state = 'menu_principal'` (re-entra al menú principal, descarta sub-menú)
- `mensajes_enviados`: plantilla `menu_principal`
- Log: `resultado = 'menu_principal_mostrado'`, `desde_state = 'menu_enfoque'`

---

### Caso 11 — BAJA dentro del menú (separación de flujos)

**Precondición:** `menu_state = 'menu_principal'`  
**Input:** `BAJA`  
**Resultado esperado:**
- La lógica BAJA actúa normalmente:
  - `estado_mensaje = 'pausado_usuario'`
  - `menu_state = null` (limpiado junto con BAJA)
  - `menu_state_updated_at = null`
  - Se encola `baja_info_mp` o `baja_thc` según estado MP
- El orquestador de menú NO es llamado
- Log en inbound con `resultado` relacionado a BAJA

---

### Caso 12 — MENU con usuario no confirmado

**Precondición:** `whatsapp_confirmado = false`  
**Input:** `MENU`  
**Resultado esperado:**
- El menú NO se activa
- Log con `resultado = 'menu_ignorado_no_confirmado'`
- El texto `MENU` es tratado como mensaje normal de confirmación

---

## Qué revisar después de cada prueba

### Estado del suscriptor

```sql
SELECT
  menu_state, menu_state_updated_at,
  estado_mensaje, contenido_preferido,
  premium_activo, estado_suscripcion
FROM suscriptores
WHERE whatsapp = '+598XXXXXXXXX';
```

### Mensajes encolados

```sql
SELECT id, tipo_mensaje, nombre_plantilla, estado, fecha_creado, metadata
FROM mensajes_enviados
WHERE id_suscriptor = <ID>
ORDER BY fecha_creado DESC
LIMIT 10;
```

Verificar que `metadata->>'variables'` contenga los valores correctos.

### Logs de ambas funciones

```sql
SELECT nombre_funcion, resultado, exito, detalle, fecha_ejecucion
FROM log_funciones
WHERE nombre_funcion IN (
  'ef_webhook_whatsapp_inbound',
  'ef_orquesta_menu_respuesta'
)
ORDER BY fecha_ejecucion DESC
LIMIT 30;
```

### Evento de webhook

```sql
SELECT id, tipo_evento, from_number, processing_status, inbound_called, inbound_http_status
FROM whatsapp_webhook_events
ORDER BY received_at_utc DESC
LIMIT 5;
```

---

## Orden de deploy

1. **Aplicar migración** (si no está aplicada desde Sprint 1):
   ```bash
   supabase db push
   ```
   Migración: `20260517120000_add_menu_state_to_suscriptores.sql`

2. **Insertar 12 plantillas nuevas** en tabla `plantillas` (`ayuda_usuario` ya existe — no reinsertar).

3. **Aprobar plantillas en Meta WhatsApp Business Manager** (proceso manual, puede tardar días).

4. **Deploy de ef_orquesta_menu_respuesta:**
   ```bash
   supabase functions deploy ef_orquesta_menu_respuesta
   ```

5. **Deploy de ef_webhook_whatsapp_inbound** (ya incluye el routing MENU del Sprint 1):
   ```bash
   supabase functions deploy ef_webhook_whatsapp_inbound
   ```
   > Si Sprint 1 ya fue deployado, este paso puede omitirse (el inbound no cambió en MVP).

6. **Verificar variables de entorno** en el dashboard de Supabase:
   - `SUPABASE_URL` ✓
   - `SUPABASE_SERVICE_ROLE_KEY` ✓
   - `SUPABASE_ANON_KEY` ✓
   - `WHATSAPP_INTERNAL_KEY` ✓

---

## Rollback

### Si el orquestador falla en producción

El orquestador es llamado asincrónicamente desde el inbound. Si falla:
- El inbound ya respondió `200` a Meta (sin pérdida de evento)
- El usuario simplemente no recibe respuesta al comando MENU
- No se afectan otros flujos (BAJA, confirmación, horóscopo diario)

**Rollback de ef_orquesta_menu_respuesta:** redeployar la versión de Sprint 1 del commit `455d4af`.

**Rollback completo (deshabilitar menú):** eliminar la sección 5.6 de `ef_webhook_whatsapp_inbound` y redeployar. Los mensajes MENU pasan a ser ignorados por el inbound (no hay efectos colaterales).

**Rollback de schema:**
```sql
ALTER TABLE public.suscriptores
  DROP COLUMN IF EXISTS menu_state,
  DROP COLUMN IF EXISTS menu_state_updated_at;
```
Solo si se hace rollback completo — requiere también rollback del inbound y el orquestador.

---

## Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| Meta demora en aprobar plantillas | Deploy en staging primero; testear con webhook simulado en Postman |
| Usuario queda en menu_state por lock timeout | Timeout de 10 min limpia automáticamente; reset manual disponible |
| Lock advisory no disponible en pool | El rpc `pg_advisory_lock` requiere conexión directa (no transactional pooling); verificar config de Supabase |
| Dos mensajes simultáneos del mismo usuario | Advisory lock por `id_suscriptor` serializa; segundo intento retorna `sin_accion motivo=lock` |
| `contenido_preferido` con valor no mapeado | `LABELS_ENFOQUE[val] ?? val` — muestra el valor crudo si no tiene label |
| `fecha_vencimiento_premium = null` | `formatearFecha(null)` devuelve `"no registrada"` |
| Opción 3 confunde "pausar mensajes" con "cancelar MP" | El log registra explícitamente `nota: NO_cancela_MP_solo_pausa_mensajes`; el copy de la plantilla debe dejar claro que la suscripción sigue activa |
