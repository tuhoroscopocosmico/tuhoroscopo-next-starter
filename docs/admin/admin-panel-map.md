# Admin Panel Map — THC

Fecha de documentación: 2026-05-15

---

## Autenticación y sesión

| Mecanismo | Detalle |
|-----------|---------|
| Librería | iron-session v8.0.4 |
| Cookie | `thc_admin_session` (httpOnly, secure en prod) |
| Secret | `SESSION_SECRET` env var |
| Middleware | `middleware.ts` — verifica cookie en todas las rutas `/admin/*` y `/api/admin/*` |
| FREE_PATHS | `/admin/login`, `/api/admin/auth/login`, `/api/admin/auth/logout` |
| Route guard | `requireAdminSession()` en cada API route — retorna null si no autenticado |

---

## Páginas del panel

| Ruta | Componente | Descripción | API que consume |
|------|-----------|-------------|-----------------|
| `/admin` | `AdminDashboard.tsx` | Dashboard con 6 métricas + resumen diario | `metricas-basicas`, `resumen-diario` |
| `/admin/suscriptores` | `app/admin/suscriptores/page.tsx` | Lista paginada con filtros + detalle inline | `suscriptores`, `suscriptor-detalle`, `suscriptor-accion` |
| `/admin/mensajes-problematicos` | `app/admin/mensajes-problematicos/page.tsx` | Mensajes fallidos/fallo_definitivo/procesando | `mensajes-problematicos`, `mensaje-detalle` |
| `/admin/contenido` | `app/admin/contenido/page.tsx` | Contenido premium generado, filtrable | `contenido` |
| `/admin/suscripciones` | `app/admin/suscripciones/page.tsx` | Suscripciones MP con detalle inline | `suscripciones` |
| `/admin/logs` | `app/admin/logs/page.tsx` | Log de ejecuciones de Edge Functions | `logs` |
| `/admin/login` | `app/admin/login/page.tsx` | Login admin (sin auth) | `auth/login` |

---

## API Routes

### Autenticación

| Ruta | Método | Función | Env vars usados |
|------|--------|---------|-----------------|
| `/api/admin/auth/login` | POST | Valida usuario/contraseña, crea sesión iron-session | `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET` |
| `/api/admin/auth/logout` | POST | Destruye sesión iron-session | `SESSION_SECRET` |

### Consulta / listado

| Ruta | Método | EF llamada | Qué retorna | PII sanitizado |
|------|--------|-----------|-------------|----------------|
| `/api/admin/metricas-basicas` | GET | `ef_admin_metricas_basicas` | Conteos globales (suscriptores, mensajes, contenido, errores) | Sin PII |
| `/api/admin/resumen-diario` | GET | `ef_admin_resumen_diario` | Enviados/fallidos/errores del día | Sin PII (no id, no whatsapp_destino, no mensaje_id_whatsapp) |
| `/api/admin/suscriptores` | GET | `ef_admin_listar_suscriptores` | Lista paginada de suscriptores | Excluye: mp_payer_email, mp_payer_id, preapproval_id, telefono, notas_internas |
| `/api/admin/suscriptor-detalle` | GET (`?id=N`) | `ef_admin_ver_estado_suscriptor` | Detalle completo de un suscriptor | Excluye: payer_email, payer_id, preapproval_id, init_point, back_url, sandbox_init_point, whatsapp_destino (mensajes), mp_payment_id (pagos) |
| `/api/admin/mensajes-problematicos` | GET | `ef_admin_listar_mensajes_problematicos` | Mensajes con estado fallido/fallo_definitivo/procesando | Excluye: whatsapp_destino, mensaje_id_whatsapp, resultado_envio, fecha_delivered, fecha_read |
| `/api/admin/contenido` | GET | `ef_admin_listar_contenido_premium` | Contenido premium generado | Sin PII |
| `/api/admin/suscripciones` | GET | `ef_admin_listar_suscripciones` | Suscripciones MP | Excluye: payer_email, payer_id, init_point, back_url, sandbox_init_point. Enmascara preapproval_id (`first4...last4`) |
| `/api/admin/logs` | GET | `ef_admin_listar_logs` | Log de ejecuciones de EFs | Sin PII |
| `/api/admin/mensaje-detalle` | GET (`?id=N`) | `ef_admin_ver_mensaje` | Detalle de un mensaje problemático | Excluye: whatsapp_destino, resultado_envio. Logs limitados a 10, sin detalle JSONB |

### Acciones

| Ruta | Método | Qué hace | Acciones permitidas | Riesgos |
|------|--------|---------|---------------------|---------|
| `/api/admin/suscriptor-accion` | POST | Ejecuta acción admin sobre suscriptor vía EF | `activar_premium_manual`, `desactivar_premium_manual`, `cambiar_fecha_vencimiento`, `cambiar_estado_suscripcion` | Modifica DB. NO afecta Mercado Pago. Requiere motivo ≥ 5 chars. |

---

## Edge Functions del panel admin

| EF | Llamada desde | Función |
|----|--------------|---------|
| `ef_admin_metricas_basicas` | `/api/admin/metricas-basicas` | Conteos globales |
| `ef_admin_resumen_diario` | `/api/admin/resumen-diario` | Resumen del día |
| `ef_admin_listar_suscriptores` | `/api/admin/suscriptores` | Lista paginada |
| `ef_admin_ver_estado_suscriptor` | `/api/admin/suscriptor-detalle` | Detalle de suscriptor |
| `ef_admin_accion_suscriptor` | `/api/admin/suscriptor-accion` | Ejecuta acción |
| `ef_admin_listar_mensajes_problematicos` | `/api/admin/mensajes-problematicos` | Lista mensajes con problemas |
| `ef_admin_ver_mensaje` | `/api/admin/mensaje-detalle` | Detalle de mensaje |
| `ef_admin_listar_contenido_premium` | `/api/admin/contenido` | Lista contenido |
| `ef_admin_listar_suscripciones` | `/api/admin/suscripciones` | Lista suscripciones MP |
| `ef_admin_listar_logs` | `/api/admin/logs` | Log de EFs |

Todas las EFs requieren:
- `Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY`
- `x-internal-key: WHATSAPP_INTERNAL_KEY`

---

## Componentes reutilizables

| Componente | Usado en | Función |
|-----------|---------|---------|
| `AdminDashboard.tsx` | `/admin` (page.tsx) | Dashboard completo (métricas + resumen diario) |
| `SuscriptorDetalle.tsx` | `/admin/suscriptores` | Panel lateral con detalle + AccionesPremium |
| `MensajeDetalle.tsx` | `/admin/mensajes-problematicos` | Panel con detalle de mensaje + guía de reintento |

---

## Navegación

Las 6 páginas del panel comparten el mismo conjunto de links:

```
Dashboard | Suscriptores | Mensajes | Contenido | Suscripciones | Logs
```

- Item activo: `<span>` con `text-white border-b-2 border-violet-500`
- Items inactivos: `<a>` con `text-gray-500 border-transparent`
- Logout: siempre `POST /api/admin/auth/logout` (iron-session destroy)

---

## Variables de entorno requeridas por el panel

| Variable | Usado en | Descripción |
|----------|---------|-------------|
| `SESSION_SECRET` | middleware, todas las API routes | Secret de iron-session |
| `ADMIN_USERNAME` | `/api/admin/auth/login` | Usuario admin |
| `ADMIN_PASSWORD` | `/api/admin/auth/login` | Contraseña admin |
| `SUPABASE_URL` | Todas las API routes | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas las API routes | JWT service role para llamar EFs |
| `WHATSAPP_INTERNAL_KEY` | Todas las API routes | Header x-internal-key para EFs |

---

## Qué modifica cada acción de admin

| Acción | Campos modificados en DB | NO modifica |
|--------|--------------------------|-------------|
| `activar_premium_manual` | `suscriptores.premium_activo=true`, `estado_suscripcion=activa`, `fecha_vencimiento_premium` | Mercado Pago |
| `desactivar_premium_manual` | `suscriptores.premium_activo=false`, `estado_suscripcion=suspendida` | Mercado Pago |
| `cambiar_fecha_vencimiento` | `suscriptores.fecha_vencimiento_premium` | Mercado Pago |
| `cambiar_estado_suscripcion` | `suscriptores.estado_suscripcion` | `premium_activo`, Mercado Pago |

---

## Riesgos y pendientes

### Menor / cosmético
- **Header inconsistente**: `logs/page.tsx` y `suscripciones/page.tsx` usan `<span>THC Admin</span>` en lugar del icono `MessageCircle` + "Panel THC" que usan las demás páginas. No afecta funcionalidad. Pendiente de decisión de estilo.

### Menor / tipo
- **`SuscriptorDetalle.tsx` línea 604**: `data.suscriptor.nombre` — el tipo `suscriptor: SuscriptorData | null` podría causar error si la API retorna `data.suscriptor = null` con `encontrado = true`. En la práctica no ocurre (la EF siempre retorna suscriptor cuando encontrado=true), pero el tipo no lo garantiza.

### Revisión de seguridad
- **Sin CSRF token explícito en acciones**: `/api/admin/suscriptor-accion` no valida un token CSRF. La protección actual es la cookie httpOnly (no accesible a JS externo) + `requireAdminSession()`. El riesgo es bajo pero vale notar para una revisión de seguridad formal.
