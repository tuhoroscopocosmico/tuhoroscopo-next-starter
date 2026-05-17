# Current Test Plan — THC (Mayo 2026)

Este documento describe cómo probar el sistema manualmente. No hay suite de tests automatizados; todo es prueba manual o revisión de logs.

---

## Antes de cualquier deploy importante

Checklist mínimo:

- [ ] `npm run build` pasa sin errores (solo warnings pre-existentes son aceptables)
- [ ] `git diff --stat` muestra solo los archivos esperados
- [ ] Los archivos críticos NO fueron tocados: `middleware.ts`, `package.json`, `package-lock.json`, EFs de MP y WA
- [ ] No hay secrets hardcodeados en ningún archivo nuevo
- [ ] Toda nueva API route `/api/admin/*` llama `requireAdminSession()` como primera línea
- [ ] Toda nueva acción sensible pide confirmación + motivo en el frontend
- [ ] El panel admin carga sin errores en `/admin` tras deploy

---

## 1. Probar flujo premium E2E

**Prerequisitos:**
- Variables de entorno configuradas en Supabase (especialmente `SANDBOX_AUTOMATIC=true` para pruebas).
- Usuario de prueba disponible (ver `docs/testing/sql-reset-e2e-test-user.sql` para resetear).
- WhatsApp real disponible para recibir mensajes.

**Pasos:**

1. **Alta:** Ir a `/checkout`, completar formulario con número WA real.
2. **Pago sandbox:** Pagar con tarjeta de prueba en MP sandbox.
3. **Verificar DB tras webhook de preapproval:**
   - `suscriptores.premium_activo = true`
   - `suscriptores.estado_suscripcion = 'activa'`
4. **Verificar DB tras webhook de pago:**
   - `pagos`: fila con `status=approved`
   - `mensajes_enviados`: fila con `tipo_mensaje=bienvenida_validacion_numero`, `estado=pendiente`
   - `suscriptores.bienvenida_enviada = true`
5. **Bienvenida WA:** Esperar el mensaje de bienvenida en WhatsApp.
6. **Confirmar:** Responder cualquier mensaje al chat de THC.
7. **Verificar DB tras confirmación:**
   - `suscriptores.whatsapp_confirmado = true`
   - `contenido_premium`: nueva fila con `estado_envio=pendiente` o `encolado`
   - `mensajes_enviados`: filas para `confirmacion_numero_ok` y el primer contenido
8. **Recibir primer mensaje premium** en WhatsApp.
9. **Verificar estado final:**
   - `suscriptores.primer_envio_premium_enviado = true`
   - `contenido_premium.estado_envio = 'enviado'`
   - `mensajes_enviados.estado = 'enviado'`

**Dónde revisar en el panel:**
- `/admin/suscriptores` → buscar por nombre → verificar flags
- `/admin/logs` → filtrar por `nombre_funcion = ef_webhook_mp`
- `/admin/mensajes-problematicos` → verificar que no haya errores

---

## 2. Probar cupones

**Prerequisitos:** Tener un cupón activo en la DB (crearlo desde `/admin/cupones`).

**Pasos:**

1. **Validación:** Ir a `/checkout`, ingresar código en el campo de descuento.
   - Debe mostrar el precio con descuento aplicado.
   - Probar código inválido: debe mostrar error.
   - Probar código expirado: debe mostrar error.
2. **Aplicación:** Completar checkout con cupón.
   - Verificar en `suscripciones`: `codigo_descuento` guardado, `descuento_estado=validado`.
3. **Post-pago:** Tras webhook MP:
   - `codigos_descuento.usos_actuales` incrementado en 1.
   - `codigos_descuento_usos`: nueva fila con `estado_uso=aplicado`.
   - `suscripciones.descuento_estado = 'aplicado'`.
4. **Panel admin:** Verificar en `/admin/cupones` que `usos_actuales` subió.
5. **Límite:** Probar usar el mismo cupón más veces que `max_usos_total` → debe rechazar.

---

## 3. Probar panel admin

### Login
- [ ] `/admin/login` carga correctamente.
- [ ] Login con credenciales correctas → redirige a `/admin`.
- [ ] Login con credenciales incorrectas → muestra error, no redirige.
- [ ] Acceder a `/admin/suscriptores` sin sesión → redirige a `/admin/login`.

### Dashboard
- [ ] `/admin` carga métricas sin errores.
- [ ] Las 6 MetricCards muestran números (no NaN, no errores).
- [ ] El resumen diario muestra enviados/fallidos/errores del día.

### Suscriptores
- [ ] La lista carga y muestra filas.
- [ ] El filtro por nombre funciona.
- [ ] El filtro por estado funciona.
- [ ] Click en fila → panel de detalle aparece.
- [ ] El detalle muestra flags correctos del suscriptor.
- [ ] La acción "Activar Premium" aparece solo cuando `premium_activo=false`.
- [ ] La acción "Desactivar Premium" aparece solo cuando `premium_activo=true`.
- [ ] Intentar acción sin motivo → error de validación.
- [ ] Acción exitosa → estado actualizado en el panel sin recargar.

### Mensajes problemáticos
- [ ] La lista muestra mensajes con estado fallido/fallo_definitivo/procesando.
- [ ] El detalle muestra el error del mensaje.
- [ ] No se muestra `whatsapp_destino`.

### Contenido
- [ ] La lista muestra contenido_premium con estado_envio.
- [ ] Los filtros de tipo y estado funcionan.

### Suscripciones
- [ ] La lista carga contratos.
- [ ] El `preapproval_id` aparece mascarado (no el valor completo).
- [ ] El filtro "Con alertas" muestra solo los que tienen `healthy=false`.
- [ ] Click en fila → modal con alertas de conciliación.
- [ ] La acción `renovar_premium` aparece solo cuando corresponde.
- [ ] No se muestra `init_point` ni `payer_email`.

### Logs
- [ ] La lista carga con filtros.
- [ ] Los botones de rango rápido (24h, 7d, 30d) filtran correctamente.
- [ ] Click en log → modal muestra detalle.
- [ ] Los valores sensibles en `detalle` aparecen como `***redacted***`.
- [ ] Las referencias (id_suscriptor, etc.) aparecen como chips con links.
- [ ] El botón "Copiar JSON" funciona.

### Cron
- [ ] `/admin/cron` carga los 9 procesos.
- [ ] Los procesos con ejecuciones recientes muestran fecha y estado.
- [ ] Los procesos sin ejecuciones muestran "Sin ejecuciones recientes en log".
- [ ] El link "Ver en logs" lleva a `/admin/logs?nombre_funcion=<fn>`.
- [ ] El botón Actualizar recarga los datos.

### Config
- [ ] `/admin/config` carga sin errores.
- [ ] `APP_DEBUG_MODE` muestra toggle ON/OFF según valor actual.
- [ ] Click en toggle → panel de confirmación aparece.
- [ ] Intentar confirmar sin motivo → error de validación.
- [ ] `whatsapp_token_app` aparece como `***redacted***`.
- [ ] Otros campos sensibles (si los hay) aparecen redactados.
- [ ] Cambio exitoso → mensaje de éxito, toggle actualizado.

---

## 4. Probar reintentos y mensajes fallidos

1. Temporalmente usar un número de WA inválido para generar un fallo.
2. Verificar en `mensajes_enviados` que `estado=fallido` y `intentos=1`.
3. Esperar el próximo ciclo de `ef_whatsapp_reintentos` (~5 min).
4. Verificar que `intentos` subió a 2.
5. Verificar en `/admin/mensajes-problematicos` que aparece el mensaje fallido.
6. Verificar en `/admin/logs` los registros de `ef_whatsapp_reintentos`.

---

## 5. Probar comandos de WhatsApp

Con un suscriptor activo y confirmado, enviar al chat de THC:

| Comando | Resultado esperado en DB | Mensaje esperado |
|---|---|---|
| "BAJA" | `estado_mensaje=pausado_usuario` | Template de baja |
| "ALTA" | `estado_mensaje=activo` | Ninguno (pendiente de confirmar) |
| "AYUDA" | Sin cambios en flags | Template `ayuda_usuario` |
| "ESTADO" | Sin cambios en flags | Template `estado_usuario` |

Verificar en `/admin/suscriptores` que `estado_mensaje` cambió correctamente.

---

## 6. Qué falta probar manualmente

- [ ] Renovación mensual: MP cobra automáticamente → webhook → premium sigue activo. **Riesgo: no fácil de probar en sandbox.**
- [ ] Cancelación desde MP: usuario cancela en MP → webhook → `premium_activo` desactivado eventualmente.
- [ ] `ef_procesar_vencimientos`: que desactive premium cuando `fecha_vencimiento < now()`.
- [ ] `ef_revisar_pendientes`: que cancele preapprovals en `pendiente_autorizacion` con TTL vencido.
- [ ] Contenido de domingo: verificar que `ef_genera_guarda_contenido_premium_domingo` genera el tipo correcto.
- [ ] Rate limit de BAJA: enviar "BAJA" dos veces en < 24h → segundo debe ser ignorado.
- [ ] Concurrencia: dos instancias del sender batch no procesen el mismo mensaje.

---

## Comandos útiles para diagnóstico

```bash
# Verificar build local
npm run build

# Ver estado del repo
git diff --stat
git status
```

**Desde el panel admin:**
- `/admin/logs` → filtrar por función específica para ver ejecuciones recientes
- `/admin/cron` → ver si algún proceso tiene error reciente
- `/admin/mensajes-problematicos` → ver mensajes stuck o fallidos

**Pendiente de confirmar:** Si existe una colección Postman o curl para probar EFs directamente. Ver `docs/testing/e2e-premium-flow.md` para el flujo detallado.
