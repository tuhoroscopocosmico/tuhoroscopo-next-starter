# Tarot THC — Modelo de Datos

**Módulo:** Tarot THC  
**Versión:** 1.0  
**Fecha:** 2026-05-18  
**Estado:** Diseño aprobado — pendiente implementación  

---

## Contexto

Módulo independiente dentro de `tuhoroscopocosmico.com/tarot/`.  
Producto one-shot: el usuario paga una vez por Mercado Pago y recibe un PDF de su tirada de tarot por WhatsApp.

**Reglas de aislamiento:**
- Todas las tablas comienzan con prefijo `tarot_`
- No se tocan tablas existentes del SaaS THC
- No comparte flujos con suscriptores, suscripciones, contenido_premium, pagos actuales ni mensajes_enviados
- No usa preapproval ni activa premium
- Todas las Edge Functions comienzan con `ef_tarot_`

---

## Sistema de Tarot — Decisión MVP

**Sistema elegido: Rider-Waite-Smith (RWS)**

| Criterio | RWS |
|---|---|
| Reconocimiento LATAM | Alto |
| Dominio público | Sí (publicado 1909) |
| Facilidad de interpretación | Alta |
| Adecuado para generación IA | Excelente |

Las imágenes del deck original 1909 están en dominio público (Wikimedia Commons).  
Para el PDF visual premium se recomienda comisionar arte propio o usar scans licenciados.  
La licencia de cada mazo queda registrada en `tarot_mazos.licencia`.

**Tirada MVP: Cruz de 5 Cartas**

| Posición | Nombre |
|---|---|
| 1 | Situación actual |
| 2 | Obstáculo / desafío |
| 3 | Raíz o pasado reciente |
| 4 | Energía que viene / futuro próximo |
| 5 | Consejo final / resultado probable |

---

## Tablas

### Resumen

| Tabla | Tipo | Descripción |
|---|---|---|
| `tarot_mazos` | Catálogo | Mazos disponibles (Rider-Waite, etc.) |
| `tarot_cartas` | Catálogo | Las 78 cartas del mazo |
| `tarot_tipos_tirada` | Catálogo | Tipos de tirada (Cruz 5, Cruz Celta, etc.) |
| `tarot_posiciones_tirada` | Catálogo | Posiciones dentro de cada tirada |
| `tarot_clientes` | Core | Datos personales del usuario |
| `tarot_ordenes` | Core | Eje central del flujo completo |
| `tarot_pagos` | Core | Registro de pagos Mercado Pago |
| `tarot_lecturas` | Core | Resultado de generación con IA |
| `tarot_lecturas_cartas` | Core | Cartas que salieron en cada lectura |
| `tarot_pdfs` | Trazabilidad | Lifecycle del PDF generado |
| `tarot_envios_whatsapp` | Trazabilidad | Registro de envíos por WhatsApp |
| `tarot_configuracion` | Operativa | Parámetros configurables del módulo |
| `tarot_logs` | Auditoría | Registro de todos los eventos del flujo |

---

### `tarot_mazos`

Catálogo de mazos disponibles. El MVP arranca con Rider-Waite únicamente.

```
id               uuid PK
nombre           text           -- "Rider-Waite-Smith"
nombre_corto     text           -- "RWS"
descripcion      text
anio_publicacion integer        -- 1909
dominio_publico  boolean
licencia         text           -- "public_domain | licensed | custom"
activo           boolean
created_at       timestamptz
updated_at       timestamptz
```

---

### `tarot_cartas`

Las 78 cartas del mazo (22 arcanos mayores + 56 menores).  
Se puebla una sola vez y no cambia entre lecturas.

```
id               uuid PK
mazo_id          uuid FK → tarot_mazos
nombre_es        text           -- "El Emperador"
nombre_en        text           -- "The Emperor"
arcano           text           -- "mayor" | "menor"
numero           smallint       -- IV para mayores, 4 para menores
palo             text           -- null para mayores | "bastos|copas|espadas|oros"
carta_corte      text           -- "as|dos|...|paje|caballero|reina|rey" (menores de corte)
imagen_url       text           -- path relativo en Supabase Storage
imagen_alt       text           -- texto alternativo accesible
significado_normal      text
significado_invertido   text
significados_por_tema   jsonb  -- {"amor": "...", "trabajo": "...", "salud": "...", "dinero": "..."}
keywords         text[]         -- ["autoridad", "estructura", "liderazgo"]
activa           boolean
created_at       timestamptz
```

---

### `tarot_tipos_tirada`

Catálogo de tipos de tirada. El MVP define solo "Cruz de 5 Cartas".

```
id               uuid PK
nombre           text           -- "Cruz de 5 Cartas"
slug             text           -- "cruz_5"
descripcion      text
cantidad_cartas  smallint       -- 5
activa           boolean
orden_display    smallint
created_at       timestamptz
```

---

### `tarot_posiciones_tirada`

Posiciones específicas dentro de cada tipo de tirada.  
Permite cambiar nombres sin tocar código.

```
id               uuid PK
tipo_tirada_id   uuid FK → tarot_tipos_tirada
numero           smallint       -- 1, 2, 3, 4, 5
nombre           text           -- "Situación actual"
descripcion      text           -- qué representa esta posición
icono            text           -- emoji o nombre de icono para el PDF
created_at       timestamptz
```

---

### `tarot_clientes`

Datos personales del usuario. Separado de órdenes por privacidad y trazabilidad.  
Si el mismo teléfono compra dos veces, no se duplican datos personales.

```
id                      uuid PK
nombre_completo         text
telefono                text           -- formato E.164: +59899123456
email                   text           -- nullable, opcional
fecha_nacimiento        date
hora_nacimiento         time           -- nullable
lugar_nacimiento        text           -- nullable
ip_registro             inet
user_agent              text
acepto_terminos         boolean
acepto_terminos_at      timestamptz
acepto_privacidad       boolean
acepto_privacidad_at    timestamptz
version_terminos        text           -- "v1.0" para saber qué versión aceptó
hash_verificacion       text           -- sha256(nombre+telefono+fechanac) para deduplicación suave
deleted_at              timestamptz    -- nullable, para borrado GDPR/URCDP
created_at              timestamptz
updated_at              timestamptz
```

---

### `tarot_ordenes`

Eje central del flujo. Representa desde que el usuario llena el formulario hasta que recibe el PDF.

```
id                    uuid PK
cliente_id            uuid FK → tarot_clientes
tipo_tirada_id        uuid FK → tarot_tipos_tirada
mazo_id               uuid FK → tarot_mazos
estado                text           -- ver catálogo de estados
external_reference    text UNIQUE    -- "TAROT-{uuid}" clave para identificar en MP
pregunta_usuario      text           -- "Necesito claridad sobre mi momento actual"
tema                  text           -- "general|amor|trabajo|salud|dinero"
precio_cobrado        numeric(10,2)
moneda                text           -- "UYU" | "ARS" | "USD"
idioma                text           -- "es"
origen_canal          text           -- "web" | "whatsapp" | "instagram"
utm_source            text           -- nullable
utm_medium            text           -- nullable
utm_campaign          text           -- nullable
ip_orden              inet
user_agent_orden      text
pagina_origen         text           -- URL completa de donde vino
notas_internas        text
created_at            timestamptz
updated_at            timestamptz
```

---

### `tarot_pagos`

Registro completo de pagos Mercado Pago.  
El `webhook_payload` se guarda sin modificar — es la prueba ante disputas.

```
id                    uuid PK
orden_id              uuid FK → tarot_ordenes
mp_preference_id      text           -- generado al crear el link de pago
mp_payment_id         text           -- llega por webhook de MP
mp_external_reference text           -- debe coincidir con ordenes.external_reference
mp_status             text           -- pending|approved|in_process|rejected|cancelled|refunded
mp_status_detail      text           -- detalle nativo de MP
mp_payment_type       text           -- credit_card|debit_card|ticket|bank_transfer
mp_payment_method_id  text           -- visa|master|redpagos|etc
mp_installments       smallint       -- cuotas (one-shot = 1)
monto                 numeric(10,2)
moneda                text
ip_pago               inet           -- IP desde la que se completó el pago
webhook_payload       jsonb          -- payload completo de MP sin modificar
webhook_received_at   timestamptz
link_pago             text           -- URL del checkout MP para mostrar al usuario
link_expira_at        timestamptz
created_at            timestamptz
updated_at            timestamptz
```

---

### `tarot_lecturas`

Resultado de la generación con IA.  
El JSON completo generado es la fuente de verdad para construir el PDF.

```
id                    uuid PK
orden_id              uuid FK → tarot_ordenes
estado                text           -- pendiente|generando|completada|error
numero_intento        smallint       -- 1, 2, 3 para reintentos
es_vigente            boolean        -- solo una lectura por orden es la vigente

prompt_sistema        text           -- prompt del sistema enviado a la IA
prompt_usuario        text           -- prompt construido con datos del cliente
ia_modelo             text           -- "claude-sonnet-4-6" | "gpt-4o"
ia_tokens_entrada     integer
ia_tokens_salida      integer
ia_costo_usd          numeric(8,6)   -- costo estimado de la llamada

contenido_json        jsonb          -- JSON completo generado (ver estructura abajo)
resumen_lectura       text           -- campo desnormalizado de contenido_json
mensaje_final         text           -- campo desnormalizado para búsqueda/soporte

error_codigo          text
error_mensaje         text
error_detalle         jsonb          -- raw de la respuesta inválida si falló

generado_at           timestamptz
created_at            timestamptz
updated_at            timestamptz
```

---

### `tarot_lecturas_cartas`

Tabla de unión entre una lectura y las cartas que salieron.  
Permite reconstruir la tirada exacta sin depender del JSON y habilita reportes analíticos.

```
id               uuid PK
lectura_id       uuid FK → tarot_lecturas
carta_id         uuid FK → tarot_cartas
posicion_id      uuid FK → tarot_posiciones_tirada
numero_posicion  smallint       -- 1 al 5 (redundante pero útil para ordenar)
invertida        boolean
interpretacion   text           -- extraído de contenido_json.cartas[n].interpretacion
consejo          text           -- extraído de contenido_json.cartas[n].consejo
created_at       timestamptz
```

---

### `tarot_pdfs`

Lifecycle del archivo PDF generado.  
Separado de la lectura porque tiene su propio ciclo de vida y puede regenerarse.

```
id                    uuid PK
orden_id              uuid FK → tarot_ordenes
lectura_id            uuid FK → tarot_lecturas
estado                text           -- pendiente|generando|generado|error_generacion|invalidado
numero_intento        smallint

storage_bucket        text           -- "tarot-pdfs"
storage_path          text           -- "2026/05/{orden_id}/lectura.pdf"
storage_url           text           -- URL pública o firmada
tamano_bytes          integer
paginas               smallint
plantilla_usada       text           -- "v1" | "v2"
hash_archivo          text           -- sha256 del PDF para verificar integridad

error_codigo          text
error_mensaje         text

generado_at           timestamptz
url_expira_at         timestamptz    -- si se usan URLs firmadas con expiración
created_at            timestamptz
updated_at            timestamptz
```

---

### `tarot_envios_whatsapp`

Registro de cada intento de envío. Un nuevo registro por reintento, nunca se sobreescribe.

```
id                    uuid PK
orden_id              uuid FK → tarot_ordenes
pdf_id                uuid FK → tarot_pdfs
estado                text           -- pendiente|enviando|enviado|entregado|leido|error|agotado_reintentos
numero_intento        smallint

telefono_destino      text           -- número E.164 del cliente
proveedor_wa          text           -- "twilio" | "meta_cloud_api"
wa_message_id         text           -- ID del mensaje en la API de WhatsApp
wa_status             text           -- estado nativo de la API
wa_error_code         text
wa_error_mensaje      text
respuesta_raw         jsonb          -- respuesta completa de la API

enviado_at            timestamptz
entregado_at          timestamptz
leido_at              timestamptz    -- si la API soporta read receipts
created_at            timestamptz
updated_at            timestamptz
```

---

### `tarot_configuracion`

Parámetros operativos del módulo. Un solo lugar para cambiar precio, modelo IA, etc.  
Los secrets (tokens de APIs) van en Supabase Secrets, no aquí.

```
id               uuid PK
clave            text UNIQUE
valor            text
tipo_valor       text           -- "string|number|boolean|json"
descripcion      text
es_secreto       boolean        -- si true, no loguear el valor
activo           boolean
created_at       timestamptz
updated_at       timestamptz
```

**Claves iniciales:**

| Clave | Valor ejemplo | Descripción |
|---|---|---|
| `precio_base_uyu` | `590` | Precio en pesos uruguayos |
| `precio_base_ars` | `4900` | Precio en pesos argentinos |
| `moneda_default` | `UYU` | Moneda por defecto |
| `ia_modelo` | `claude-sonnet-4-6` | Modelo IA activo |
| `ia_max_tokens` | `2000` | Máximo tokens respuesta |
| `ia_temperatura` | `0.8` | Temperatura de generación |
| `mazo_default` | `{uuid}` | UUID del mazo por defecto |
| `tipo_tirada_default` | `{uuid}` | UUID de la tirada por defecto |
| `max_reintentos_lectura` | `3` | Reintentos antes de error crítico |
| `max_reintentos_pdf` | `2` | Reintentos de generación PDF |
| `max_reintentos_wa` | `3` | Reintentos de envío WhatsApp |
| `wa_proveedor` | `twilio` | Proveedor de WhatsApp activo |
| `storage_bucket_assets` | `tarot-assets` | Bucket de imágenes de cartas |
| `storage_bucket_pdfs` | `tarot-pdfs` | Bucket de PDFs generados |
| `pdf_url_expiracion_horas` | `48` | Horas de validez URL firmada |
| `version_terminos` | `v1.0` | Versión actual de T&C |

---

### `tarot_logs`

Auditoría completa de todos los eventos. Fuente de verdad para debugging y soporte.

```
id               uuid PK
orden_id         uuid           -- nullable, referencia soft a tarot_ordenes
cliente_id       uuid           -- nullable, referencia soft a tarot_clientes
evento           text           -- ver catálogo de eventos abajo
nivel            text           -- "debug|info|warning|error|critical"
mensaje          text
payload          jsonb          -- contexto completo del evento
ip               inet
user_agent       text
duracion_ms      integer        -- duración de la operación si aplica
funcion_origen   text           -- "ef_tarot_crear_orden | ef_tarot_webhook_mp | ..."
created_at       timestamptz
```

**Catálogo de eventos:**

```
orden_creada              mp_preference_creada       mp_webhook_recibido
pago_confirmado           pago_rechazado             pago_expirado
lectura_iniciada          lectura_completada         lectura_error
pdf_iniciado              pdf_generado               pdf_error
wa_enviado                wa_entregado               wa_error
estado_cambiado           reintento_programado       intervencion_manual
```

---

## Relaciones Entre Tablas

```
tarot_mazos ──────────────── 1:N ──> tarot_cartas
tarot_tipos_tirada ────────── 1:N ──> tarot_posiciones_tirada

tarot_clientes ────────────── 1:N ──> tarot_ordenes
tarot_mazos ──────────────── 1:N ──> tarot_ordenes
tarot_tipos_tirada ────────── 1:N ──> tarot_ordenes

tarot_ordenes ─────────────── 1:1 ──> tarot_pagos
tarot_ordenes ─────────────── 1:N ──> tarot_lecturas        (N por reintentos)
tarot_ordenes ─────────────── 1:N ──> tarot_pdfs            (N por reintentos)
tarot_ordenes ─────────────── 1:N ──> tarot_envios_whatsapp
tarot_ordenes ─────────────── 1:N ──> tarot_logs

tarot_lecturas ────────────── 1:N ──> tarot_lecturas_cartas
tarot_cartas ─────────────── 1:N ──> tarot_lecturas_cartas
tarot_posiciones_tirada ───── 1:N ──> tarot_lecturas_cartas

tarot_lecturas ────────────── 1:N ──> tarot_pdfs
tarot_pdfs ───────────────── 1:N ──> tarot_envios_whatsapp
```

---

## Estados del Flujo

### `tarot_ordenes.estado`

```
formulario_completo   → usuario completó el form, aún no pagó
pago_iniciado         → se generó el link de MP, esperando pago
pago_confirmado       → webhook MP aprobado
pago_rechazado        → MP rechazó o canceló el pago
pago_expirado         → el link de pago venció sin uso
generando_lectura     → Edge Function llamando a la IA
lectura_lista         → JSON de IA generado correctamente
generando_pdf         → Edge Function construyendo el PDF
pdf_listo             → PDF guardado en Storage
enviando_whatsapp     → intentando envío
entregado             → WhatsApp confirmó entrega
error_lectura         → falló generación de IA (reintentable)
error_pdf             → falló generación PDF (reintentable)
error_whatsapp        → falló envío WA (reintentable)
error_critico         → fallo sin recuperación, requiere intervención manual
cancelado             → cancelado manualmente
```

### `tarot_pagos.mp_status`

```
pending / approved / in_process / rejected / cancelled / refunded / charged_back
```

### `tarot_pdfs.estado`

```
pendiente / generando / generado / error_generacion / invalidado
```

### `tarot_envios_whatsapp.estado`

```
pendiente / enviando / enviado / entregado / leido / error / agotado_reintentos
```

---

## Estructura del JSON de Lectura

El campo `tarot_lecturas.contenido_json` sigue esta estructura:

```json
{
  "titulo": "Tu Tirada Cósmica",
  "nombre": "Julio Origoni",
  "tipo_tirada": "Cruz de 5 Cartas",
  "fecha_nacimiento": "20/12/1971",
  "pregunta": "Necesito claridad sobre mi momento actual",
  "tema": "general",
  "fecha_lectura": "2026-05-18",
  "cartas": [
    {
      "posicion": 1,
      "nombre_posicion": "Situación actual",
      "carta": "El Emperador",
      "invertida": false,
      "interpretacion": "...",
      "consejo": "..."
    },
    {
      "posicion": 2,
      "nombre_posicion": "Obstáculo / desafío",
      "carta": "Diez de Bastos",
      "invertida": false,
      "interpretacion": "...",
      "consejo": "..."
    },
    {
      "posicion": 3,
      "nombre_posicion": "Raíz o pasado reciente",
      "carta": "La Luna",
      "invertida": true,
      "interpretacion": "...",
      "consejo": "..."
    },
    {
      "posicion": 4,
      "nombre_posicion": "Energía que viene",
      "carta": "As de Oros",
      "invertida": false,
      "interpretacion": "...",
      "consejo": "..."
    },
    {
      "posicion": 5,
      "nombre_posicion": "Consejo final",
      "carta": "El Sol",
      "invertida": false,
      "interpretacion": "...",
      "consejo": "..."
    }
  ],
  "resumen_lectura": "...",
  "mensaje_final": "...",
  "proximos_pasos": [
    "...",
    "..."
  ],
  "disclaimer": "Lectura simbólica generada con inteligencia artificial con fines reflexivos y de entretenimiento."
}
```

---

## Storage — Estructura de Buckets

```
tarot-assets/            (bucket privado — imágenes de cartas)
  mazos/
    rider-waite/
      mayor/
        00-el-loco.webp
        01-el-mago.webp
        04-el-emperador.webp
        ...
        21-el-mundo.webp
      menor/
        bastos/
          as-de-bastos.webp
          ...
        copas/
          ...
        espadas/
          ...
        oros/
          ...

tarot-pdfs/              (bucket privado — PDFs generados)
  2026/
    05/
      {orden_id}/
        lectura-tarot.pdf
```

- `tarot_cartas.imagen_url` guarda el path relativo: `mazos/rider-waite/mayor/04-el-emperador.webp`
- Las Edge Functions construyen la URL completa al momento de generar el PDF
- Resolución de imágenes: mínimo 600×1040px (ratio 1:1.73, estándar tarot)
- Formato: WebP para menor peso con buena calidad

---

## Edge Functions del Módulo

| Función | Responsabilidad |
|---|---|
| `ef_tarot_crear_orden` | Recibe form, crea cliente + orden + pago, devuelve link MP |
| `ef_tarot_webhook_mp` | Recibe notificaciones de MP, dispara el flujo |
| `ef_tarot_generar_lectura` | Llama a IA, valida JSON, guarda lectura y cartas |
| `ef_tarot_generar_pdf` | Construye el PDF con template + JSON + imágenes |
| `ef_tarot_enviar_whatsapp` | Envía el PDF por WhatsApp al cliente |
| `ef_tarot_estado_orden` | Consulta pública del estado de una orden (para frontend) |
| `ef_tarot_admin_reenviar` | Reenvío manual desde panel admin |

---

## Riesgos y Cuidados

### Legales

- **Ley 18.331 (Uruguay)** — protección de datos personales, equiparable a GDPR. Registrarse ante URCDP según escala. Implementar derechos ARCO.
- **Consentimiento explícito** — campos `acepto_terminos` + `acepto_privacidad` con timestamp y versión de T&C son la prueba ante reclamos.
- **Disclaimer** — debe aparecer en el formulario, en el PDF y en el mensaje de WhatsApp.
- **Política de reembolsos** — producto digital generado a demanda. Definirlo en T&C antes de lanzar.
- **Imágenes** — usar scans del deck original 1909 (dominio público) o arte propio/licenciado. Documentar licencia en `tarot_mazos.licencia`.

### Técnicos

- **Idempotencia del webhook** — MP puede enviar el mismo evento más de una vez. `ef_tarot_webhook_mp` debe ser idempotente.
- **Race condition** — dos webhooks simultáneos podrían duplicar la generación. Usar `FOR UPDATE SKIP LOCKED` o flag atómico al cambiar estado.
- **Expiración de URLs** — si el PDF tiene URL firmada, puede vencer antes de que el usuario la abra. Evaluar enviar el archivo adjunto directamente por WhatsApp.
- **JSON inválido de IA** — validar schema antes de guardar. Si falla, reintentar. Guardar el raw inválido en `error_detalle` para debugging.
- **Números de teléfono** — almacenar siempre en E.164. Validar en el formulario. Un número mal formateado es un PDF perdido con pago cobrado.
- **Costo de IA** — monitorear `ia_costo_usd` en `tarot_lecturas`. Controlar con `max_tokens` en configuración.
