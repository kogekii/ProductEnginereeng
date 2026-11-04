# Operación y API de retiros externos

Guía técnica del circuito de retiros descrito en [`00-producto.md`](00-producto.md). El servicio funciona en el mismo origen que el cliente y usa la sesión HTTP existente.

## Flujo del apoderado

1. `GET /api/guardian/pickups/context` devuelve fecha actual, los dos meses visibles, las fechas elegibles calculadas por el servidor y estudiantes activos vinculados.
2. `POST /api/documents` sin query sube el documento del apoderado.
3. `POST /api/documents?type=EXTERNAL_IDENTITY&guardianDocumentId=<uuid>` sube el documento del externo asociado al documento anterior.
4. `POST /api/guardian/pickups` envía el lote completo con una clave de idempotencia.
5. `GET /api/guardian/pickups` y `GET /api/guardian/pickups/:id` consultan el historial propio.

### Ejemplo de envío

```json
{
  "idempotencyKey": "90000000-0000-4000-8000-000000000001",
  "guardianDocumentId": "60000000-0000-4000-8000-000000000001",
  "externalPerson": {
    "firstName": "Nombres",
    "lastName": "Apellidos",
    "documentType": "RUT",
    "documentNumber": "12.345.678-5",
    "relationship": "Familiar",
    "documentId": "60000000-0000-4000-8000-000000000002"
  },
  "days": [
    { "date": "2026-11-06", "studentIds": ["30000000-0000-4000-8000-000000000001"] }
  ]
}
```

Las fechas son civiles `YYYY-MM-DD` en `America/Santiago`, no timestamps. El servidor revalida cada día y cada vínculo. El lote se confirma completo o no se registra. Si la respuesta se pierde, se reintenta con la misma clave y contenido; una modificación requiere una clave nueva.

Errores de envío: `INVALID_SELECTION`, `INVALID_DOCUMENT`, `PICKUP_CONFLICT`, `IDEMPOTENCY_CONFLICT`, `PICKUP_DATES_EXPIRED` y `RETRYABLE_ERROR`. Un conflicto identifica solo los estudiantes y fechas propios afectados; no incluye información del otro solicitante. Ningún error de negocio produce pares parciales.

## Revisión de dirección

- `GET /api/admin/pickups?page=1&pageSize=20&date=YYYY-MM-DD&status=PENDING_REVIEW` filtra por fecha, estado o ambos; página máxima: 100.
- `GET /api/admin/pickups/:id` muestra el lote entero y la disponibilidad de ambos documentos.
- `GET /api/documents/:id` entrega archivos como adjuntos privados y sin caché, según sesión y relaciones autorizadas.
- `POST /api/admin/pickups/:id/review` recibe `{"decision":"APPROVE"}` o `{"decision":"REJECT","reason":"Motivo para el apoderado"}`.

La aprobación aplica a todo el lote; permite el día del retiro y exige que ninguna fecha haya pasado y que ambos documentos sigan disponibles. El rechazo exige motivo y libera los pares; se conserva el historial. Ambos cambios se auditan dentro de la transacción.

## Archivos y privacidad

Se admiten JPG, PNG y PDF, hasta 10 MB, con verificación de contenido. La carga del externo requiere el UUID del documento del apoderado y el orden se valida en el servidor. Las asociaciones se serializan mediante un contador interno por documento para evitar que una autorización y un retiro reclamen simultáneamente el mismo archivo.

Los archivos se almacenan fuera de `public/`; se accede a ellos solo por el endpoint con autorización y `Cache-Control: no-store`. Las respuestas y logs no incluyen contenido, URL pública, RUT ni nombres como metadatos de auditoría. La fecha de retención queda registrada y los documentos vencidos o eliminados no se descargan.

**Estado de seguridad:** el almacenamiento existente es privado, pero no está cifrado y no incluye un job de eliminación física. La política de producto exige cifrado y eliminación a los 12 meses antes de usar cédulas reales en producción; esta guía no declara esos controles implementados.

## Guion de demostración y validación de experiencia

Usa solo las cuentas y documentos ficticios del modo de demostración.

1. Inicia sesión como apoderado y abre **Retiro Externo**.
2. Selecciona un día del mes actual y otro del siguiente; comprueba que cada uno muestra a todos los estudiantes vinculados.
3. Abre **Cambiar estudiantes por día**, quita un estudiante solo de una fecha y revisa la marca **Selección distinta**.
4. Completa el externo, sube ambos archivos en el orden solicitado y confirma que el resumen representa exactamente la selección.
5. Envía la solicitud y confirma que aparece **Pendiente de revisión**, no **Aprobada**.
6. Inicia sesión como administrador, filtra por fecha/estado, abre ambos documentos y aprueba o rechaza el lote completo.
7. Vuelve a la cuenta del apoderado y confirma el estado; si se rechazó, verifica el motivo y crea una nueva solicitud con documentos nuevos.

**Verificación automatizada:** Playwright ejecuta los dos flujos en Chromium de escritorio y móvil; el viewport móvil se reduce a 320 px y se comprueba que no haya desplazamiento horizontal. La compatibilidad con el navegador interno de WhatsApp y el tiempo/abandono con apoderados reales siguen pendientes de validación manual. No se ha medido un tiempo de tarea con usuarios.

## Base de datos

La migración `20261104000000_external_pickup_requests` agrega solicitud, persona externa, pares de retiro, reserva única por estudiante/fecha, clave de idempotencia y relación de precedencia documental. `20261104001000_document_claim_version` serializa reclamaciones entre los módulos de retiros y autorizaciones. Rechazar elimina solo las reservas activas, no el detalle ni la auditoría.
