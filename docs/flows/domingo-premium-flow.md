# Flujo Contenido Premium Domingo — Referencia Operativa

**Última actualización:** Mayo 2026

---

## Arquitectura del flujo

```
[pg_cron — domingos 09:00 UTC]
        ↓
ef_genera_guarda_contenido_premium_domingo
   Lee config[contenido_premium_domingo_hora_programada]
   Genera para cada suscriptor premium activo (tipo_suscripcion=premium, estado_suscripcion=activa)
   Guarda en contenido_premium (tipo='domingo', estado_envio='pendiente')
   fecha_envio_programada = DomingoT13:00:00.000Z  (= 10:00 Uruguay)
        ↓
[pg_cron — diario (el mismo domingo más tarde)]
        ↓
ef_orquesta_envio_contenido_premium
   → ef_run_encolador_premium
        Filtra: estado_envio='pendiente' AND fecha_envio_programada <= now()
        Crea filas en mensajes_enviados (tipo_mensaje='premium', tipo_contenido='domingo')
        Variables: {nombre, balance_semanal, intencion_semana, ritual_simple, cierre_inspirador}
        Actualiza contenido_premium.estado_envio = 'encolado'
        ↓
[pg_cron — ef_run_sender_batch, frecuente]
        ↓
ef_whatsapp_sender
   Verifica metadata.fecha_envio_programada <= now() (si es futuro y no hay force_send, salta)
   Resuelve template 'contenido_premium_domingo' desde tabla plantillas
   Envía a Meta WhatsApp Cloud API
   Actualiza mensajes_enviados.estado = 'enviado'
   Llama ef_actualiza_envio_real_premium → actualiza contenido_premium.estado_envio = 'enviado'
```

---

## Zona horaria

Uruguay = **UTC-3** sin DST (desde 2015). Sin casos borde por cambio de horario.

| Hora Uruguay | UTC | Uso |
|---|---|---|
| 06:00 | 09:00 | Generación domingo (pg_cron) |
| 09:00 | 12:00 | Orquestador diario (si aplica) |
| 10:00 | 13:00 | Envío programado del mensaje domingo |

---

## Configuración centralizada (tabla `config`)

| nombre | valor | descripción |
|---|---|---|
| `contenido_premium_hora_generacion` | `09:00` | Hora UTC de generación diaria |
| `contenido_premium_hora_programada` | `11:30` | Hora UTC de envío diario (08:30 Uruguay) |
| `contenido_premium_domingo_hora_generacion` | `09:00` | Hora UTC de generación domingo |
| `contenido_premium_domingo_hora_programada` | `13:00` | Hora UTC de envío domingo (10:00 Uruguay) |
| `timezone_contenido` | `America/Montevideo` | Zona horaria del negocio (referencia) |

**Para cambiar horario de envío domingo** (sin deploy):
```sql
UPDATE config SET valor = '14:00'
WHERE nombre = 'contenido_premium_domingo_hora_programada';
-- 14:00 UTC = 11:00 Uruguay
```

---

## Contrato de contenido domingo

La función `ef_openia_genera_contenido_premium_domingo` devuelve exactamente estas 4 claves:

```json
{
  "balance_semanal":   "...",
  "intencion_semana":  "...",
  "ritual_simple":     "...",
  "cierre_inspirador": "..."
}
```

El template Meta `contenido_premium_domingo` tiene 5 variables:
- `{{1}}` = `nombre` (del suscriptor)
- `{{2}}` = `balance_semanal`
- `{{3}}` = `intencion_semana`
- `{{4}}` = `ritual_simple`
- `{{5}}` = `cierre_inspirador`

---

## Precondiciones de suscriptor para recibir contenido domingo

El generador filtra actualmente:
- `tipo_suscripcion = 'premium'`
- `estado_suscripcion = 'activa'`

El **encolador** aplica además:
- `premium_activo = true`
- `whatsapp_confirmado = true`
- `estado_mensaje <> 'pausado_usuario'`

Si un suscriptor pasa el generador pero no el encolador, el contenido queda en `estado_envio='pendiente'` indefinidamente (no se encola, no se envía).

---

## SQL — Insertar/actualizar configuración horaria

```sql
INSERT INTO public.config (nombre, valor)
VALUES
  ('contenido_premium_hora_generacion',           '09:00'),
  ('contenido_premium_hora_programada',           '11:30'),
  ('contenido_premium_domingo_hora_generacion',   '09:00'),
  ('contenido_premium_domingo_hora_programada',   '13:00'),
  ('timezone_contenido',                          'America/Montevideo')
ON CONFLICT (nombre) DO UPDATE
  SET valor = EXCLUDED.valor;
```

---

## SQL — Crear cron de generación domingo (desactivado)

```sql
-- Paso 1: crear el cron
-- Horario: 09:00 UTC todos los domingos (0 = domingo en cron)
SELECT cron.schedule(
  'genera-contenido-domingo',
  '0 9 * * 0',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/ef_genera_guarda_contenido_premium_domingo',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Paso 2: desactivarlo hasta verificar que todo funciona
UPDATE cron.job
SET active = false
WHERE jobname = 'genera-contenido-domingo';
```

> **Nota:** `current_setting('app.supabase_url')` y `current_setting('app.supabase_anon_key')` son
> configuraciones de sesión de Postgres. Si tu entorno Supabase no las expone así,
> reemplazá con los valores literales entre comillas simples. Consultá con el equipo
> antes de activar el cron.

### Activar cuando estés listo:
```sql
UPDATE cron.job SET active = true WHERE jobname = 'genera-contenido-domingo';
```

### Verificar crons activos:
```sql
SELECT jobname, schedule, active, command
FROM cron.job
ORDER BY jobname;
```

---

## SQL — Verificación post-generación

### Contenido domingo generado hoy:
```sql
SELECT
  cp.id,
  s.nombre,
  s.signo,
  cp.tipo,
  cp.estado_envio,
  cp.fecha_envio_programada,
  cp.generado_por,
  cp.generado
FROM contenido_premium cp
JOIN suscriptores s ON s.id = cp.id_suscriptor
WHERE cp.tipo = 'domingo'
  AND cp.fecha_envio_programada::date = CURRENT_DATE
ORDER BY cp.id;
```

### Mensajes domingo en outbox:
```sql
SELECT
  me.id,
  me.id_suscriptor,
  me.nombre_plantilla,
  me.estado,
  me.fecha_creado,
  me.metadata->>'tipo_contenido' AS tipo_contenido,
  me.metadata->'variables'->>'nombre' AS var_nombre
FROM mensajes_enviados me
WHERE me.tipo_mensaje = 'premium'
  AND me.metadata->>'tipo_contenido' = 'domingo'
ORDER BY me.fecha_creado DESC
LIMIT 20;
```

### Estado completo del día domingo:
```sql
SELECT
  cp.id AS id_contenido,
  s.nombre,
  cp.estado_envio AS estado_cp,
  me.id AS id_mensaje,
  me.estado AS estado_outbox,
  me.fecha_enviado
FROM contenido_premium cp
JOIN suscriptores s ON s.id = cp.id_suscriptor
LEFT JOIN mensajes_enviados me ON me.id_contenido = cp.id
WHERE cp.tipo = 'domingo'
  AND cp.fecha_envio_programada::date = CURRENT_DATE
ORDER BY cp.id;
```

### Logs relevantes:
```sql
SELECT nombre_funcion, fecha_ejecucion, resultado, exito
FROM log_funciones
WHERE nombre_funcion IN (
  'ef_genera_guarda_contenido_premium_domingo',
  'ef_run_encolador_premium',
  'ef_whatsapp_sender',
  'ef_actualiza_envio_real_premium'
)
ORDER BY fecha_ejecucion DESC
LIMIT 30;
```

---

## Token WhatsApp

El token de WhatsApp Cloud API se lee en runtime desde el Supabase Secret `WHATSAPP_TOKEN`.

### En dev (token temporal, expira en 24h):
```bash
npx supabase secrets set WHATSAPP_TOKEN=<nuevo_token_de_meta>
# No hace falta redeploy. El secret se lee en runtime.
```

### En producción:
Usar un **System User Token** permanente desde Meta Business Manager:
`Settings → System Users → generar token` con permisos:
- `whatsapp_business_messaging`
- `whatsapp_business_management`

Este token no expira mientras el System User esté activo.

### No tocar:
- `WHATSAPP_INTERNAL_KEY` — autenticación inter-función, distinto al token de Meta
- `SUPABASE_SERVICE_ROLE_KEY` — key de Supabase, no de Meta
- `configuracion.whatsapp_token_app` — campo informativo en DB, no se usa para envío

### Cómo detectar token vencido en logs:
```sql
SELECT fecha_ejecucion, resultado, detalle
FROM log_funciones
WHERE nombre_funcion = 'ef_whatsapp_sender'
  AND exito = false
ORDER BY fecha_ejecucion DESC
LIMIT 10;
-- Buscar en detalle: "OAuthException", "code: 190", "Invalid OAuth"
```

---

## Función eliminada: ef_enviar_whatsapp_premium_domingo

Esta función fue **eliminada del repositorio** porque:
1. Tenía `MODO_TEST = true` hardcodeado — nunca enviaba mensajes reales.
2. Usaba el contrato viejo de 7 claves (`saludo_inicial`, `balance_semana`, `desafio_cosmico`, etc.) que es incompatible con el generador actual (4 claves).
3. Bypasseaba el outbox pattern — enviaba texto libre, no template.
4. No tenía referencias en ningún otro archivo del repo.

El flujo correcto es el outbox: generador → encolador → sender batch → sender unitario.

---

## Verificación de que el sender batch está activo

```sql
SELECT nombre_funcion, fecha_ejecucion, resultado, exito
FROM log_funciones
WHERE nombre_funcion = 'ef_run_sender_batch'
ORDER BY fecha_ejecucion DESC
LIMIT 5;
-- Si no hay filas recientes (últimas 24h): el batch no está corriendo.
```

### Mensajes pendientes acumulados (todos los tipos):
```sql
SELECT tipo_mensaje, nombre_plantilla, estado, COUNT(*)
FROM mensajes_enviados
WHERE estado IN ('pendiente', 'procesando')
GROUP BY tipo_mensaje, nombre_plantilla, estado
ORDER BY COUNT(*) DESC;
```

### Reset de mensajes stuck en 'procesando' (>10 minutos):
```sql
-- Solo correr si hay mensajes stuck confirmados
UPDATE mensajes_enviados
SET estado = 'pendiente'
WHERE estado = 'procesando'
  AND fecha_ultimo_intento < NOW() - INTERVAL '10 minutes';
```
