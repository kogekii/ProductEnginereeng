# Proposal

## Why

El sistema aún no permite que un apoderado autorice a sus estudiantes para un evento: no existe el flujo de firma, ni el registro de la autorización, ni la vista del administrador para saber quiénes faltan. Este change crea esa capacidad desde cero y la diseña para que un apoderado pueda autorizar a uno, varios o todos sus estudiantes en uno, varios o todos los eventos aplicables, con un solo escaneo de su documento por envío. Además, entrega al administrador una vista de seguimiento de los eventos del mes actual y el siguiente.

## What Changes

- Se crea el mecanismo completo de autorización de estudiantes para eventos, incluido el flujo mínimo de un solo evento y un solo estudiante, que debe funcionar de extremo a extremo.
- Se cubren las combinaciones de un estudiante con varios eventos, varios estudiantes con un evento y varios estudiantes con varios eventos.
- Se entrega una base mínima ejecutable en modo demostración: scaffold, login simulado por teléfono o correo, datos de prueba en las tablas y documento de identidad simulado. El OTP real y la captura real del documento quedan para changes posteriores.
- El apoderado entra a **Firmar Autorización** y ve los eventos publicados y vigentes que aplican a al menos uno de sus estudiantes.
- Puede seleccionar uno o varios eventos y, dentro de cada evento, uno, varios o todos sus estudiantes aplicables.
- El botón **Seleccionar todos los eventos** selecciona todos los pares estudiante–evento aplicables del apoderado.
- El botón **Seleccionar todos** dentro de un evento selecciona solo los estudiantes del apoderado que aplican a ese evento.
- Los pares que ya tienen una autorización vigente se muestran como **Ya autorizada** y no se pueden volver a seleccionar. No se revela qué apoderado firmó.
- Si el evento aún no ha ocurrido y todos los estudiantes aplicables del apoderado ya están autorizados, el evento permanece visible y se marca como **Estudiantes Autorizados**.
- Antes de confirmar se muestra un resumen obligatorio y único con todos los pares seleccionados: evento, fecha y hora, estudiante, propósito y fecha límite.
- El apoderado escanea su documento de identidad **una sola vez por envío**, aunque el lote incluya varios eventos o estudiantes.
- Al confirmar, el sistema crea una autorización por cada par válido, con su propia evidencia, e informa que el envío fue exitoso.
- Si algún par deja de ser válido entre el resumen y la confirmación, el envío es parcial: se crean los pares válidos y una pantalla de resultado indica cuáles quedaron autorizados y cuáles no, con el motivo.
- Una autorización anulada deja de ser vigente: el estudiante vuelve a contar como pendiente y el apoderado puede firmar una nueva, conservando la anulada en la auditoría.
- El administrador accede a un menú **Eventos** con los eventos publicados y cerrados del mes actual y del mes siguiente que aún no han ocurrido, filtrables por curso. Cada evento muestra cuántas autorizaciones faltan.
- Al entrar a un evento, el administrador ve el listado de estudiantes que aún no autorizan, con su curso y sus apoderados.
- El dashboard del administrador ofrece **Cerrar sesión**. Al usarlo, revoca la sesión actual, limpia la cookie de sesión y devuelve al usuario a `/login`.

**BREAKING**: ninguno. No existe una funcionalidad previa de autorizaciones que reemplazar; este change la introduce.

## Capabilities

### New Capabilities

- `guardian-authorizations`: mecanismo completo de autorización, incluido el flujo mínimo de un evento y un estudiante, la selección múltiple, el resumen obligatorio, la firma por lote con un solo documento y el resultado parcial del envío.
- `admin-authorization-tracking`: menú de eventos del administrador con filtro por curso, contador de autorizaciones faltantes y listado de estudiantes pendientes por evento.

### Modified Capabilities

Ninguna. El repositorio aún no tiene specs principales.

## Impact

- **Estado actual**: el repositorio no tiene código de autorizaciones; este change crea el mecanismo completo, no una optimización sobre un flujo existente.
- **Scaffold**: se crea el monolito mínimo (Fastify, Prisma, React/Vite), la configuración validada, el seed de demostración y los scripts de desarrollo, test y build.
- **Reglas de negocio afectadas de `docs/00-producto.md`**: 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 25 y 27.
- **Módulos**: `auth` (sesión y rol), `events` (eventos publicados y aplicabilidad), `authorizations` (selección, resumen, firma y resultado), `documents` (un documento por envío) y `admin` (seguimiento por evento).
- **Base de demostración**: este change incluye el scaffold mínimo, el login simulado por teléfono o correo, el seed de datos falsos y un proveedor de documento simulado. El OTP, la captura real y el cifrado de documentos se abordan en changes posteriores.
- **Modelo de datos**: `Authorization` mantiene una sola autorización vigente por estudiante y evento. Se requiere una relación que agrupe las autorizaciones creadas en un mismo envío y un documento de identidad compartido por ese envío. El detalle se define en `design.md`.
- **API**: endpoints para listar eventos con estudiantes aplicables y su estado, y para confirmar un envío con varios pares.
- **Interfaz**: pantalla de eventos, selección por evento, selección masiva, resumen, captura del documento y resultado del envío; menú y detalle de eventos en el dashboard, con cierre de sesión accesible para el administrador.
- **Tests**: unitarios de aplicabilidad, exclusión de ya autorizadas, resumen, resultado parcial y contador del administrador; E2E de los flujos 1, 1.2, 2 y 3.
- **Fuera de alcance**: retiros externos, OCR, firma avanzada, notificaciones o recordatorios, la acción administrativa de anular autorizaciones, creación o edición de eventos, importación CSV, el OTP real, la captura real y el cifrado de documentos, y la capa de seguridad completa. El flujo sí considera el efecto de una autorización ya anulada.
