# Proposal

## Why

Los retiros coordinados por WhatsApp dejan a dirección sin certeza sobre quién retirará a cada estudiante. El apoderado necesita registrar varios días con pocas acciones y saber que el colegio recibió la solicitud; dirección necesita revisar ambos documentos y resolverla desde la misma plataforma.

## What Changes

- Habilitar **Retiro Externo** con un calendario de mes actual y siguiente, navegación superior y selección múltiple conservada entre meses. Solo permite desde mañana de lunes a viernes en `America/Santiago`; los feriados no se distinguen ni bloquean.
- Seleccionar por defecto todos los estudiantes activos vinculados en cada día nuevo. Permitir una selección común para días no personalizados y una opción secundaria **Cambiar estudiantes por día**, sin dejar fechas vacías al continuar.
- Registrar exactamente un externo por lote, con nombres, apellidos, RUT o pasaporte y parentesco o vínculo. Los retiros siguen siendo pares estudiante–fecha, no autorizaciones globales para la familia.
- Adjuntar primero el documento del apoderado y después el del externo, una vez cada uno; revisar un resumen obligatorio y enviar todo de forma atómica e idempotente.
- Mostrar confirmación **Pendiente de revisión** y permitir consultar las solicitudes propias y el motivo de rechazo. Dirección podrá listar por fecha y estado, abrir el detalle y ambos documentos, aprobar el lote o rechazarlo con motivo.
- Mantener permisos en servidor, impedir dos solicitudes activas para un estudiante y fecha incluso entre apoderados distintos y auditar envío y revisión.
- Alinear `docs/00-producto.md`, `AGENTS.md` y `openspec/config.yaml` con las decisiones confirmadas: reemplazan la ventana de 60 días y los distintos externos por día. No hay una API de retiros existente que romper.

### Alcance de la primera entrega

Un circuito verificable completo: solicitud del apoderado → revisión de dirección → estado consultable. Se usa el acceso existente; los retiros requieren ambos documentos reales incluso en modo demo, usando archivos ficticios en pruebas. No se agrega otro mecanismo de autenticación.

Quedan fuera: cancelación o edición de solicitudes enviadas, aprobación parcial por estudiante o fecha, marcar retiro realizado, agenda recurrente, libreta de externos, borradores persistidos en servidor, correos de confirmación, notificaciones masivas, OCR, firma avanzada, tratamiento de feriados y administración de bloqueos. El cifrado y la eliminación física a los 12 meses se mantienen como requisitos del producto y dependencias para operación real; este change no implementa la capa completa de seguridad ni presenta el almacenamiento actual como cifrado.

## Capabilities

### New Capabilities

- `guardian-pickups`: calendario, selección por día, externo único, documentos ordenados, resumen, envío atómico/idempotente y consulta de solicitudes propias.
- `admin-pickup-review`: consulta por fecha y estado, revisión privada de documentos y decisión auditada del lote completo.

### Modified Capabilities

Ninguna. `openspec list --specs` no registra capacidades principales. El change existente `student-authorization-signing` cubre autorizaciones de eventos, que conservan su comportamiento.

## Impact

- **Producto:** reglas 2–4, 14–25 y 27 de `docs/00-producto.md`; fechas, pertenencia, identidad, estados, unicidad, evidencia y privacidad.
- **Backend propuesto:** nuevo módulo `src/server/modules/pickups/`, contratos compartidos de retiro, conexión en `src/server/app.ts` y extensión acotada de documentos. Reusar sesión, guardas y almacenamiento privado existentes.
- **Datos:** migración aditiva de solicitudes, externos y pares estudiante–fecha, con garantía de exclusividad activa y de idempotencia. No modificar autorizaciones ya registradas.
- **Cliente propuesto:** nueva feature de retiros, rutas de apoderado y revisión administrativa; integración con inicio y navegación del administrador. Mantener marca del colegio, Charis SIL, controles accesibles y uso móvil en WhatsApp.
- **Verificación:** tests unitarios de fechas/selección, integración PostgreSQL de transacciones/permisos/documentos y E2E de solicitud y revisión. No se requieren servicios externos ni nuevas dependencias de calendario.
