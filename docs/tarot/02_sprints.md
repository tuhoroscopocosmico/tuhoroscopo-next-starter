# Tarot THC — Plan de Sprints

**Módulo:** Tarot THC  
**Versión:** 1.0  
**Fecha:** 2026-05-18  
**Documento relacionado:** `01_modelo_datos.md`

---

## Visión General

```
Sprint 1 → Base de datos (tablas, RLS, seeds)
Sprint 2 → Edge Functions core (crear orden, webhook MP)
Sprint 3 → Generación de contenido con IA
Sprint 4 → Generación de PDF
Sprint 5 → Envío por WhatsApp
Sprint 6 → Frontend (formulario + estado de orden)
Sprint 7 → Panel admin + monitoreo
Sprint 8 → QA, stress test, lanzamiento
```

---

## Sprint 1 — Base de Datos

**Objetivo:** Tener todas las tablas creadas, con RLS, índices y datos iniciales listos en Supabase.  
**Resultado esperado:** Se puede insertar una orden completa manualmente desde Supabase Studio y recorrer todo el modelo de datos.

---

### Tareas

#### 1.1 — Tablas de Catálogo

Crear en orden (respetan dependencias de FK):

1. `tarot_mazos`
2. `tarot_cartas`
3. `tarot_tipos_tirada`
4. `tarot_posiciones_tirada`

Verificar:
- `tarot_cartas` referencia `tarot_mazos` via FK
- `tarot_posiciones_tirada` referencia `tarot_tipos_tirada` via FK
- Índice en `tarot_cartas(mazo_id, arcano, palo)`

#### 1.2 — Tablas Core del Flujo

Crear en orden:

5. `tarot_clientes`
6. `tarot_ordenes`
7. `tarot_pagos`
8. `tarot_lecturas`
9. `tarot_lecturas_cartas`

Verificar:
- `tarot_ordenes.external_reference` es UNIQUE
- `tarot_ordenes` referencia clientes, tipos_tirada y mazos
- `tarot_lecturas` referencia ordenes
- `tarot_lecturas_cartas` referencia lecturas, cartas y posiciones

#### 1.3 — Tablas de Trazabilidad

10. `tarot_pdfs`
11. `tarot_envios_whatsapp`

Verificar:
- `tarot_pdfs` referencia ordenes y lecturas
- `tarot_envios_whatsapp` referencia ordenes y pdfs

#### 1.4 — Tablas Operativas y Auditoría

12. `tarot_configuracion`
13. `tarot_logs`

Verificar:
- `tarot_configuracion.clave` es UNIQUE
- `tarot_logs` usa FK soft (sin CASCADE) a ordenes y clientes

#### 1.5 — Índices

Crear los índices necesarios para queries frecuentes del flujo:

```sql
-- Buscar orden por external_reference (webhook de MP)
CREATE INDEX ON tarot_ordenes(external_reference);

-- Buscar órdenes por estado (monitoreo)
CREATE INDEX ON tarot_ordenes(estado);

-- Buscar lectura vigente de una orden
CREATE INDEX ON tarot_lecturas(orden_id, es_vigente);

-- Buscar PDFs por orden
CREATE INDEX ON tarot_pdfs(orden_id, estado);

-- Buscar envíos por orden
CREATE INDEX ON tarot_envios_whatsapp(orden_id, estado);

-- Logs por orden (soporte)
CREATE INDEX ON tarot_logs(orden_id, created_at DESC);

-- Buscar cartas por mazo y arcano
CREATE INDEX ON tarot_cartas(mazo_id, arcano);
```

#### 1.6 — Row Level Security (RLS)

Aplicar RLS a todas las tablas. El módulo Tarot opera principalmente desde Edge Functions con `service_role` (bypass RLS), pero se aplica RLS como capa de defensa.

**Política general:**
- Tablas de catálogo (`tarot_mazos`, `tarot_cartas`, `tarot_tipos_tirada`, `tarot_posiciones_tirada`): lectura pública, escritura solo service_role.
- Tablas core y de trazabilidad: sin acceso anónimo. Solo service_role.
- `tarot_configuracion`: sin acceso anónimo. Solo service_role.
- `tarot_logs`: sin acceso anónimo. Solo service_role.

```sql
-- Habilitar RLS en todas las tablas tarot_
ALTER TABLE tarot_mazos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_cartas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_tipos_tirada ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_posiciones_tirada ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_ordenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_lecturas_cartas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_envios_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarot_logs ENABLE ROW LEVEL SECURITY;

-- Catálogo: lectura pública
CREATE POLICY "tarot_mazos_lectura_publica"
  ON tarot_mazos FOR SELECT USING (true);

CREATE POLICY "tarot_cartas_lectura_publica"
  ON tarot_cartas FOR SELECT USING (activa = true);

CREATE POLICY "tarot_tipos_tirada_lectura_publica"
  ON tarot_tipos_tirada FOR SELECT USING (activa = true);

CREATE POLICY "tarot_posiciones_tirada_lectura_publica"
  ON tarot_posiciones_tirada FOR SELECT USING (true);
```

#### 1.7 — Seeds Iniciales

Insertar datos de base necesarios para que el flujo funcione:

**`tarot_mazos`** — 1 registro: Rider-Waite-Smith

**`tarot_tipos_tirada`** — 1 registro: Cruz de 5 Cartas

**`tarot_posiciones_tirada`** — 5 registros:
| # | Nombre | Descripción |
|---|---|---|
| 1 | Situación actual | Dónde estás parado hoy |
| 2 | Obstáculo / desafío | Qué se interpone en tu camino |
| 3 | Raíz o pasado reciente | De dónde viene esta situación |
| 4 | Energía que viene | Lo que está por manifestarse |
| 5 | Consejo final | La síntesis y el camino a seguir |

**`tarot_cartas`** — 78 registros (los 22 arcanos mayores + 56 menores del RWS).  
Se puede hacer via script SQL o CSV import desde Supabase Studio.

**`tarot_configuracion`** — Valores iniciales del módulo (ver tabla en `01_modelo_datos.md`).

#### 1.8 — Verificación Final del Sprint

Checklist antes de cerrar el sprint:

- [ ] Las 13 tablas existen en Supabase
- [ ] Todas las FK son correctas y tienen ON DELETE apropiado
- [ ] RLS habilitado en todas las tablas
- [ ] Índices creados
- [ ] Seeds cargados: 1 mazo, 78 cartas, 1 tipo de tirada, 5 posiciones, configuración base
- [ ] Se puede insertar una orden de prueba desde Supabase Studio sin errores
- [ ] Se puede recorrer el flujo completo a nivel de datos: cliente → orden → pago → lectura → lecturas_cartas → pdf → envio_wa → log
- [ ] No hay referencias a tablas existentes del SaaS THC

---

## Sprint 2 — Edge Functions Core

**Objetivo:** `ef_tarot_crear_orden` y `ef_tarot_webhook_mp` funcionando en staging.  
El flujo de pago completo debe ejecutarse de punta a punta sin frontend (testeado con Postman/curl).

**Tareas principales:**
- Crear `ef_tarot_crear_orden`: recibe datos del form, crea cliente + orden, llama MP Preferences API, devuelve link de pago
- Crear `ef_tarot_webhook_mp`: endpoint público, valida firma MP, actualiza `tarot_pagos`, dispara generación si aprobado
- Idempotencia: si la orden ya está aprobada, no procesar nuevamente
- Registrar todos los eventos en `tarot_logs`
- Tests con MP sandbox

---

## Sprint 3 — Generación de Contenido IA

**Objetivo:** `ef_tarot_generar_lectura` funciona: tira 5 cartas aleatoriamente, llama a la IA con prompt estructurado, valida el JSON devuelto, guarda en `tarot_lecturas` y `tarot_lecturas_cartas`.

**Tareas principales:**
- Algoritmo de selección aleatoria de cartas (sin repetición, con posibilidad de carta invertida)
- Construcción del prompt con datos del cliente, cartas tiradas y posiciones
- Llamada a la IA (Claude via Anthropic SDK)
- Validación del JSON devuelto contra el schema esperado
- Guardado en `tarot_lecturas` + descomposición en `tarot_lecturas_cartas`
- Manejo de reintentos con `numero_intento`
- Estimación y registro de costo IA en `ia_costo_usd`

---

## Sprint 4 — Generación de PDF

**Objetivo:** `ef_tarot_generar_pdf` produce un PDF visual premium a partir del JSON de lectura e imágenes de cartas, y lo guarda en Supabase Storage.

**Tareas principales:**
- Definir la plantilla visual del PDF (diseño, tipografía, colores)
- `ef_tarot_generar_pdf`: toma `contenido_json`, descarga imágenes de cartas desde Storage, renderiza PDF
- Subir PDF a `tarot-pdfs/{año}/{mes}/{orden_id}/lectura-tarot.pdf`
- Registrar path, URL, hash y tamaño en `tarot_pdfs`
- Manejo de reintentos

---

## Sprint 5 — Envío por WhatsApp

**Objetivo:** `ef_tarot_enviar_whatsapp` envía el PDF al cliente por WhatsApp y registra el resultado.

**Tareas principales:**
- Integrar proveedor WA (Twilio o Meta Cloud API)
- `ef_tarot_enviar_whatsapp`: envía el PDF adjunto o link al número del cliente
- Registrar en `tarot_envios_whatsapp` con `respuesta_raw`
- Manejo de reintentos con `numero_intento`
- Actualizar estado de la orden a `entregado`
- `ef_tarot_admin_reenviar`: reenvío manual desde panel

---

## Sprint 6 — Frontend

**Objetivo:** La página `tuhoroscopocosmico.com/tarot/` está online y permite completar el flujo completo.

**Tareas principales:**
- Formulario de datos del cliente (nombre, teléfono, fecha nacimiento, pregunta/tema)
- Checkbox de aceptación de T&C y política de privacidad
- Llamada a `ef_tarot_crear_orden` al submit
- Redirección al link de MP
- Página de estado de orden (`/tarot/estado?ref=TAROT-xxx`) con polling a `ef_tarot_estado_orden`
- Estados visuales: esperando pago → generando → listo → error
- Página de éxito con mensaje de confirmación

---

## Sprint 7 — Panel Admin y Monitoreo

**Objetivo:** El equipo puede ver el estado del módulo, gestionar errores y hacer reenvíos manuales.

**Tareas principales:**
- Vista de órdenes con filtros por estado, fecha, teléfono
- Detalle de orden: cliente, pago, lectura, PDF, envíos WA, logs
- Botón de reenvío manual de WhatsApp
- Botón de regeneración de PDF
- Dashboard de métricas: órdenes del día, tasa de éxito, costo IA acumulado
- Alertas si hay errores críticos acumulados

---

## Sprint 8 — QA y Lanzamiento

**Objetivo:** El módulo está probado, seguro y listo para producción.

**Tareas principales:**
- Test end-to-end completo en staging con MP sandbox
- Test de idempotencia del webhook (enviar el mismo evento 3 veces)
- Test de reintentos: simular fallo de IA, PDF y WhatsApp
- Test de carga básico
- Revisión de RLS: verificar que no hay acceso no autorizado desde cliente
- Revisión legal: T&C, disclaimer, política de privacidad publicados
- Configuración de secrets en Supabase producción
- Migración de seeds a producción
- Smoke test en producción con pago real de $1
- Lanzamiento
