# Testing: Cupones de descuento MVP

## Tipos soportados en MVP

| Tipo | Soporte |
|------|---------|
| `porcentaje` | ✅ Soportado |
| `monto_fijo` | ✅ Soportado |
| `primera_cuota` | ❌ Pendiente (no compatible con preapproval fijo de MP) |
| `dias_gratis` | ❌ Pendiente |
| `meses_gratis` | ❌ Pendiente |

## Flujo completo

```
[Browser]
  → Ingresa código → POST /api/validar-codigo
    → llama ef_validar_codigo_descuento (server-side, con x-internal-key)
    → devuelve { ok, precio_aplicado, mensaje_usuario, ... }
  → Muestra descuento en UI
  → Submit form → POST /api/iniciar-checkout (con codigo_descuento)
    → re-valida ef_validar_codigo_descuento (server-side, monto NUNCA viene del browser)
    → llama ef_crear_suscripcion (con monto=precio_aplicado, campos de descuento)
      → crea preapproval en MP con el monto descontado
      → guarda suscripcion con descuento_estado='validado'
    → devuelve init_point
  → Redirige a MP
[MP]
  → Usuario paga
  → Webhook → ef_webhook_mp (preapproval authorized)
    → detecta descuento_estado='validado' en suscripciones
    → llama ef_aplicar_codigo_descuento
    → actualiza descuento_estado='aplicado'
```

## Variables de entorno requeridas

- `WHATSAPP_INTERNAL_KEY` — requerida en Vercel y Supabase para llamadas internas
- `SUPABASE_URL` — URL de Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — key de servicio

## Crear un código de prueba en DB

```sql
INSERT INTO codigos_descuento (
  codigo,
  tipo_descuento,
  valor_descuento,
  precio_recurrente_normal,
  activo,
  max_usos_total,
  usos_actuales,
  aplica_a_producto,
  aplica_a_plan,
  fecha_inicio
) VALUES (
  'TEST50',          -- código
  'porcentaje',      -- tipo
  50,                -- 50% de descuento
  390,               -- precio normal
  true,
  100,               -- máximo 100 usos
  0,
  'premium',
  'mensual',
  NOW()
);
```

Para `monto_fijo` (ej: $U 100 de descuento):
```sql
INSERT INTO codigos_descuento (
  codigo, tipo_descuento, valor_descuento, precio_recurrente_normal,
  activo, max_usos_total, usos_actuales, aplica_a_producto, aplica_a_plan, fecha_inicio
) VALUES (
  'DESCUENTO100', 'monto_fijo', 100, 390, true, 50, 0, 'premium', 'mensual', NOW()
);
```

## Test 1: Validar código via API proxy

```
POST /api/validar-codigo
Content-Type: application/json

{
  "codigo": "TEST50",
  "precio_base": 390
}
```

Respuesta esperada (código válido):
```json
{
  "ok": true,
  "codigo_id": "uuid...",
  "tipo_descuento": "porcentaje",
  "precio_original": 390,
  "precio_aplicado": 195,
  "valor_descuento_aplicado": 195,
  "mensaje_usuario": "50% de descuento aplicado"
}
```

Respuesta esperada (código inválido):
```json
{
  "ok": false,
  "error": "El código no es válido o ya fue utilizado"
}
```

## Test 2: Checkout completo con descuento

```
POST /api/iniciar-checkout
Content-Type: application/json

{
  "nombre": "Ana García",
  "telefono": "99123456",
  "whatsapp": "+59899123456",
  "signo": "aries",
  "contenido_preferido": "amor",
  "pais": "UY",
  "fuente": "web-vercel-checkout-v3",
  "version_politicas": "v1.0",
  "acepto_politicas": true,
  "codigo_descuento": "TEST50",
  "codigo_descuento_id": "uuid del codigo"
}
```

Verificaciones en DB tras la llamada:
- `suscripciones.amount` debe ser **195** (no 390)
- `suscripciones.codigo_descuento` debe ser `'TEST50'`
- `suscripciones.descuento_estado` debe ser `'validado'`
- `pagos.amount` debe ser **195**

## Test 3: Verificar que MP recibe el monto descontado

En la respuesta del checkout, el `init_point` lleva a MP con el preapproval creado.
Verificar en Supabase dashboard → `log_funciones`:

```
nombre_funcion = 'ef_crear_suscripcion'
resultado = 'payload_mp_enviado'
```

El campo `detalle` debe contener `transaction_amount: 195`.

## Test 4: Webhook aplica el descuento

Simular webhook de preapproval autorizado via Postman:

```
POST <SUPABASE_URL>/functions/v1/ef_webhook_mp?topic=preapproval&id=<PREAPPROVAL_ID>
Authorization: Bearer <SUPABASE_ANON_KEY>
x-manual-test: true
```

Verificaciones en DB:
- `suscripciones.descuento_estado` debe cambiar de `'validado'` a `'aplicado'`
- `codigos_descuento_usos` debe tener un registro nuevo con `estado_uso = 'aplicado'`
- `codigos_descuento.usos_actuales` debe incrementarse en 1
- `log_funciones` debe tener `resultado = 'DESCUENTO_APLICADO_OK'`

## Casos límite

| Caso | Comportamiento esperado |
|------|------------------------|
| Código expirado | `ok: false`, mensaje de error, precio normal |
| Código agotado | `ok: false`, mensaje de error, precio normal |
| Código inválido en servidor (bypass) | Ignora descuento, cobra $U 390 |
| Tipo no soportado (primera_cuota) | `ok: false` en `/api/validar-codigo` |
| descuento_estado ya 'aplicado' | ef_aplicar rechaza doble uso |
| Usuario ya usó el código (max_usos_por_usuario=1) | `ok: false` en validación |
