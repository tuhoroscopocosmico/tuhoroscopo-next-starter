-- =============================================================================
-- SQL DE LIMPIEZA PARA TEST E2E — FLUJO PREMIUM THC
-- =============================================================================
-- ADVERTENCIA: NO EJECUTAR EN PRODUCCIÓN.
-- Este archivo es SOLO documentación de qué SQL ejecutar en un entorno
-- de staging/sandbox para resetear un usuario de prueba entre tests E2E.
-- No modificar lógica ni datos reales de producción.
--
-- Variables a reemplazar antes de ejecutar:
--   :test_whatsapp   → ej: '+59899123456'  (número WhatsApp E.164 del usuario test)
--   :test_id         → ej: 42              (id en tabla suscriptores, si se conoce)
-- =============================================================================

-- =============================================================================
-- PASO 0: Identificar el suscriptor de prueba
-- =============================================================================
-- Ejecutar primero para obtener el id antes de borrar nada
SELECT
  id,
  nombre,
  whatsapp,
  tipo_suscripcion,
  estado_suscripcion,
  premium_activo,
  whatsapp_confirmado,
  bienvenida_enviada,
  primer_envio_premium_enviado,
  estado_mensaje,
  actualizado_en
FROM suscriptores
WHERE whatsapp = ':test_whatsapp';

-- =============================================================================
-- PASO 1: Limpiar contenido premium generado
-- =============================================================================
DELETE FROM contenido_premium
WHERE id_suscriptor = :test_id;

-- =============================================================================
-- PASO 2: Limpiar mensajes encolados / outbox
-- =============================================================================
DELETE FROM mensajes_enviados
WHERE id_suscriptor = :test_id;

-- =============================================================================
-- PASO 3: Limpiar pagos registrados
-- =============================================================================
DELETE FROM pagos
WHERE id_suscriptor = :test_id;

-- =============================================================================
-- PASO 4: Limpiar suscripciones MP
-- =============================================================================
DELETE FROM suscripciones
WHERE id_suscriptor = :test_id;

-- =============================================================================
-- PASO 5: Resetear flags del suscriptor
-- =============================================================================
-- Opción A: Reset completo al estado inicial (antes de cualquier pago)
UPDATE suscriptores
SET
  tipo_suscripcion          = 'premium',
  estado_suscripcion        = 'pendiente_autorizacion',
  premium_activo            = false,
  whatsapp_confirmado       = false,
  fecha_confirmacion_whatsapp = NULL,
  bienvenida_enviada        = false,
  primer_envio_premium_enviado = false,
  fecha_primer_envio_premium  = NULL,
  fecha_inicio_premium      = NULL,
  fecha_vencimiento_premium = NULL,
  fecha_baja                = NULL,
  motivo_baja               = NULL,
  preapproval_id            = NULL,
  preapproval_status        = NULL,
  auto_renovacion_activa    = false,
  estado_mensaje            = 'activo',
  actualizado_en            = NOW()
WHERE id = :test_id;

-- =============================================================================
-- PASO 5B: Alternativa — Resetear solo los flags de bienvenida/confirmación
-- (para probar solo la parte del webhook inbound sin recrear el flujo de pago)
-- =============================================================================
-- UPDATE suscriptores
-- SET
--   whatsapp_confirmado          = false,
--   fecha_confirmacion_whatsapp  = NULL,
--   bienvenida_enviada           = false,
--   primer_envio_premium_enviado = false,
--   fecha_primer_envio_premium   = NULL,
--   actualizado_en               = NOW()
-- WHERE id = :test_id;

-- =============================================================================
-- PASO 6: Limpiar logs de prueba (opcional, para no contaminar /admin/logs)
-- =============================================================================
-- Descomentar solo si se quiere limpiar los logs del test
--
-- DELETE FROM log_funciones
-- WHERE detalle->>'id_suscriptor' = ':test_id'
--    OR (detalle->'suscriptor'->>'id')::text = ':test_id'::text;

-- =============================================================================
-- PASO 7: Verificar estado final
-- =============================================================================
SELECT
  id,
  nombre,
  whatsapp,
  tipo_suscripcion,
  estado_suscripcion,
  premium_activo,
  whatsapp_confirmado,
  bienvenida_enviada,
  primer_envio_premium_enviado,
  estado_mensaje,
  actualizado_en
FROM suscriptores
WHERE id = :test_id;

-- Verificar que las tablas relacionadas están limpias
SELECT COUNT(*) AS pagos_count        FROM pagos          WHERE id_suscriptor = :test_id;
SELECT COUNT(*) AS suscripciones_count FROM suscripciones WHERE id_suscriptor = :test_id;
SELECT COUNT(*) AS mensajes_count     FROM mensajes_enviados WHERE id_suscriptor = :test_id;
SELECT COUNT(*) AS contenido_count    FROM contenido_premium WHERE id_suscriptor = :test_id;

-- =============================================================================
-- BORRADO TOTAL (SOLO SI SE QUIERE PROBAR EL REGISTRO DESDE CERO)
-- =============================================================================
-- Descomentar solo si también se quiere eliminar el suscriptor para probar /checkout
--
-- DELETE FROM suscriptores WHERE id = :test_id;
-- =============================================================================
