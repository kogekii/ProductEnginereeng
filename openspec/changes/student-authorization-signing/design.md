# Design

## Context

Ver `proposal.md` para la motivación y el alcance. Los requisitos están en `specs/guardian-authorizations/spec.md` y `specs/admin-authorization-tracking/spec.md`.

El repositorio no tiene código de aplicación ni scaffold. Este change crea el mínimo ejecutable para demostrar el flujo completo de autorizaciones: un monolito TypeScript con Fastify, Prisma y PostgreSQL, y un cliente React con Vite. La base de datos parte vacía, por lo que la primera migración crea todo el modelo necesario.

Restricciones que condicionan el diseño:

- Un solo colegio, alrededor de 300 estudiantes y baja concurrencia. No se justifican colas, cachés distribuidas ni microservicios.
- El flujo debe funcionar en el navegador interno de WhatsApp y en teléfonos, con selección táctil amplia.
- El modo demostración debe permitir entrar sin OTP real y firmar sin capturar el documento, pero sin romper las reglas de negocio ni el registro de evidencia.
- El OTP real, la captura real del documento y el cifrado en reposo quedan para changes posteriores. Este diseño deja las interfaces preparadas para incorporarlos sin reescribir los servicios.
- Las fechas se muestran en `America/Santiago`; el servidor es la única autoridad para decidir si un evento permite firmar.

## Goals / Non-Goals

**Goals:**

- Entregar un flujo ejecutable de extremo a extremo en modo demostración: login simulado, datos de prueba, listado de eventos, selección múltiple, resumen, confirmación automática con documento simulado, resultado parcial y seguimiento del administrador.
- Mantener la separación `ruta → servicio → repositorio` y concentrar las reglas de negocio en servicios.
- Garantizar en la base de datos una sola autorización vigente por estudiante y evento, conservando las anuladas.
- Hacer el envío idempotente y con resultado parcial explícito por par.
- Dejar puertos claros para OTP, almacenamiento de documentos y reloj, de modo que la versión real se conecte después.

**Non-Goals:**

- Implementar OTP real por WhatsApp o correo, envío de correos, cifrado de documentos o captura real desde la cámara.
- Implementar la acción administrativa de anular autorizaciones; el diseño solo considera el efecto de una autorización ya anulada.
- Crear o editar eventos, importar datos por CSV o gestionar apoderados desde la interfaz.
- Endurecer la capa de seguridad completa: rate limit, CSRF, rotación de sesiones y auditoría exhaustiva se abordan en un change de seguridad.

## Decisions

### 1. Scaffold mínimo con modo demostración explícito

Se crea un solo paquete con el stack objetivo. Fastify sirve la API y, en producción, el build de React desde el mismo origen. En desarrollo, Vite hace proxy de `/api` hacia Fastify.

El modo demostración se controla con `DEMO_MODE=true` y cambia solo dos puntos de entrada:

- **Login**: `POST /api/auth/demo-login` recibe un correo o teléfono, busca un `User` activo cuyo correo o teléfono normalizado coincida y crea una `Session` real con token aleatorio, hash persistido y cookie `httpOnly`. No se emite OTP.
- **Documento**: al confirmar un envío, si no llega `documentId`, el servidor usa un `SimulatedDocumentProvider` que crea un `Document` marcado como simulado, con un archivo PNG de relleno en el almacenamiento privado. El apoderado no ve una pantalla de captura.

El arranque falla si `DEMO_MODE=true` y `NODE_ENV=production`. La pantalla de login muestra un bloque con las cuentas de demostración solo cuando el modo está activo.

Alternativas descartadas:

- Incluir OTP real: agrega un proveedor externo y su tratamiento de errores, fuera del alcance.
- Usar mocks en memoria: no permite demostrar el flujo con base de datos, migraciones ni concurrencia real.
- Login sin sesión: impediría validar permisos en el servidor, que es una regla del proyecto.

### 2. Módulos y responsabilidades

```text
src/server/modules/
├─ auth/            sesión, cookie, guardas de rol
├─ students/        vínculos apoderado–estudiante
├─ events/          eventos y cálculo de aplicabilidad
├─ authorizations/  selección, envío, resultado y evidencia
├─ documents/       almacenamiento privado y acceso autorizado
└─ admin/           seguimiento por evento y filtros
```

- `EventApplicabilityService` calcula estudiantes objetivo y aplicables. Es la única implementación de la fórmula de `docs/00-producto.md` y la usan tanto el apoderado como el administrador.
- `AuthorizationSubmissionService` valida cada par, aplica idempotencia, crea las autorizaciones y arma el resultado parcial.
- `DocumentService` decide dónde se guarda un archivo, valida tipo y tamaño, y autoriza su lectura.
- `AdminTrackingService` calcula contadores y pendientes con una consulta agregada, sin reutilizar la lógica de selección del cliente.
- Las rutas solo validan con Zod, llaman al servicio y serializan. Los repositorios son los únicos que usan Prisma.

Alternativas descartadas:

- Un módulo único de autorizaciones: mezcla aplicabilidad, documentos y seguimiento, y dificulta los tests.
- Validar permisos en el cliente: prohibido por las reglas del proyecto.

### 3. Modelo de datos

Se agregan los siguientes modelos a `prisma/schema.prisma`, con tablas y columnas en `snake_case` mediante `@@map` y `@map`.

| Modelo | Campos principales | Restricciones |
|---|---|---|
| `User` | `id`, `email?`, `phoneE164?`, nombres, apellidos, `isAdmin`, `isActive` | Al menos correo o teléfono; correo en minúsculas; teléfono en E.164 |
| `Session` | `id`, `userId`, `tokenHash`, `expiresAt`, `revokedAt?`, `ip?`, `userAgent?` | Token nunca en claro |
| `Course` | `id`, `name`, `level`, `year`, `isActive` | — |
| `Student` | `id`, `documentType`, `documentNumber`, nombres, apellidos, `courseId`, `isActive` | Documento único |
| `GuardianStudent` | `id`, `guardianId`, `studentId`, `relationship`, `isPrimary` | Único por apoderado y estudiante |
| `Event` | `id`, `type`, `title`, `description`, `location`, `startsAt`, `endsAt`, `authorizationText`, `deadlineAt`, `status`, `createdById` | `status` en `DRAFT`, `PUBLISHED`, `CLOSED`, `CANCELLED` |
| `EventCourse` | `id`, `eventId`, `courseId` | Único por evento y curso |
| `EventStudentException` | `id`, `eventId`, `studentId`, `mode` | Único por evento y estudiante; `mode` en `INCLUDE`, `EXCLUDE` |
| `Document` | `id`, `type`, `privatePath`, `mimeType`, `sizeBytes`, `sha256`, `isEncrypted`, `isSimulated`, `deleteAfter`, `deletedAt?`, `createdAt` | Sin URL pública |
| `AuthorizationSubmission` | `id`, `guardianId`, `documentId?`, `idempotencyKey`, `ip`, `userAgent`, `sessionId`, `status`, `resultSnapshot?`, `createdAt` | Único por apoderado y clave de idempotencia |
| `Authorization` | `id`, `eventId`, `studentId`, `guardianId`, `submissionId`, `documentId`, `status`, `signedAt`, `ip`, `userAgent`, `sessionId`, `authorizationTextSnapshot`, `authorizationTextHash`, `summarySnapshot`, `annulledAt?`, `annulledById?`, `annulmentReason?` | Ver índice parcial |
| `AuditLog` | `id`, `actorId?`, `action`, `entity`, `entityId`, `metadata`, `ip`, `userAgent`, `createdAt` | Sin datos personales en `metadata` |

Decisiones del modelo:

- **`AuthorizationSubmission` agrupa el envío** y guarda el documento, la sesión, la IP, el user agent y la clave de idempotencia. Cada `Authorization` referencia el envío y además conserva `documentId` para que su evidencia sea autocontenida. Es una referencia duplicada intencional: si mañana cambia el envío, la autorización no pierde su respaldo.
- **Índice único parcial** sobre `authorization (event_id, student_id) WHERE status = 'SIGNED'`. Prisma no expresa índices parciales en el schema, así que se crea con SQL dentro de la migración inicial. Las filas `ANNULLED` quedan fuera del índice y se conservan.
- **`summarySnapshot`** es JSON con el par, el título y las fechas del evento, el propósito, la fecha límite y el total de pares del envío. Se guarda por autorización porque el resumen mostrado es parte de la evidencia.
- **`resultSnapshot`** guarda el resultado del envío para que un reintento con la misma clave devuelva exactamente lo mismo sin volver a procesar.
- **Índices de consulta**: `authorization (submission_id)`, `authorization (guardian_id, status)`, `authorization (event_id, status)`, `event (status, starts_at)`, `event (deadline_at)` y `event_student_exception (event_id, student_id)`.

Alternativas descartadas:

- Solo `submissionId` sin tabla de envío: no hay un lugar único para la idempotencia ni para el documento compartido.
- Tabla aparte de anuladas: duplica el modelo y complica las consultas de vigencia.
- Validar la unicidad solo en el servicio: una carrera entre dos apoderados podría duplicar la autorización vigente.

### 4. Contrato de API

Todas las respuestas usan JSON en `camelCase`. Los errores tienen `code` estable y `message` en español de Chile.

**Autenticación**

| Método y ruta | Uso |
|---|---|
| `POST /api/auth/demo-login` | `{ identifier }`; crea sesión y cookie `httpOnly` |
| `POST /api/auth/logout` | Revoca la sesión actual |
| `GET /api/auth/me` | Devuelve usuario, rol y si el modo demo está activo |

**Apoderado**

| Método y ruta | Uso |
|---|---|
| `GET /api/guardian/authorizations/events` | Eventos publicados y vigentes con sus estudiantes aplicables y el estado de cada uno |
| `POST /api/guardian/authorizations/submissions` | Confirma un envío con varios pares |

`GET /api/guardian/authorizations/events` devuelve, por evento: `id`, `title`, `startsAt`, `endsAt`, `deadlineAt`, `purpose`, `allAuthorized` y `students[]` con `id`, `fullName`, `alreadyAuthorized`. El servidor calcula `allAuthorized` con la misma consulta de aplicabilidad; el cliente no lo deduce.

`POST /api/guardian/authorizations/submissions` recibe:

```json
{
  "idempotencyKey": "uuid-v4",
  "documentId": "opcional; en modo demo se omite",
  "pairs": [{ "eventId": "uuid", "studentId": "uuid" }]
}
```

Responde `200` con resultado parcial:

```json
{
  "submissionId": "uuid",
  "created": [{ "eventId": "uuid", "studentId": "uuid", "authorizationId": "uuid" }],
  "failed": [{ "eventId": "uuid", "studentId": "uuid", "code": "DEADLINE_PASSED", "message": "La fecha límite para firmar ya venció." }],
  "createdCount": 2,
  "failedCount": 1
}
```

Reglas del contrato:

- La sesión define al apoderado. El cliente nunca envía `guardianId`.
- Un lote vacío, un par repetido o más de 100 pares se rechazan con `400 INVALID_SELECTION` antes de crear nada.
- Si el lote es válido pero ningún par se puede autorizar, la respuesta sigue siendo `200` con `createdCount: 0` y el motivo de cada par. No es un error de transporte.
- Los códigos de fallo por par son `STUDENT_NOT_LINKED`, `STUDENT_NOT_APPLICABLE`, `EVENT_NOT_SIGNALABLE`, `DEADLINE_PASSED`, `ALREADY_AUTHORIZED` y `PAIR_DUPLICATED`.
- Un reintento con la misma `idempotencyKey` devuelve el `resultSnapshot` guardado, aunque el estado de los eventos haya cambiado.

**Documentos**

| Método y ruta | Uso |
|---|---|
| `POST /api/documents` | Carga previa del documento; devuelve `documentId`. No se usa en modo demo |
| `GET /api/documents/:id` | Lectura autorizada; apoderado dueño del envío o administrador |

**Administrador**

| Método y ruta | Uso |
|---|---|
| `GET /api/admin/events?courseIds=...` | Eventos del mes actual y el siguiente, con contadores |
| `GET /api/admin/events/:id/pending` | Estudiantes pendientes con curso y apoderados |

`GET /api/admin/events` devuelve `applicableCount`, `pendingCount` y `status`. El detalle devuelve solo estudiantes sin autorización vigente, con `fullName`, `courseName` y `guardians[]` con `fullName`, `email` y `phone`.

Alternativas descartadas:

- Multipart en la confirmación: mezcla la subida con la creación de autorizaciones y complica el reintento y el resultado parcial.
- Base64 en el JSON: aumenta el cuerpo, consume memoria y choca con los límites de Fastify.
- Un endpoint por par: multiplica las solicitudes y pierde la noción de envío único.

### 5. Confirmación, concurrencia e idempotencia

El servicio procesa el envío en este orden:

1. Resuelve la sesión y el apoderado. Sin sesión, `401 AUTH_REQUIRED`.
2. Valida el cuerpo con Zod y normaliza los pares, eliminando duplicados exactos y rechazando el lote si quedan menos pares que los enviados.
3. Busca el envío por `(guardianId, idempotencyKey)`. Si existe y tiene `resultSnapshot`, lo devuelve sin cambios.
4. Crea el `AuthorizationSubmission` con estado `RECEIVED`, o lo reutiliza si quedó incompleto por un corte.
5. Obtiene o crea el documento: usa el `documentId` recibido, validando que pertenezca al apoderado y no esté usado por otro envío, o genera el documento simulado en modo demo.
6. Para cada par, valida vínculo, aplicabilidad, estado del evento y fecha límite con la hora del servidor, y luego intenta insertar la autorización.
7. Si la inserción choca con el índice único parcial, marca el par como `ALREADY_AUTHORIZED` y continúa. Los pares son independientes: no se envuelve el lote completo en una transacción, porque el resultado parcial es un requisito.
8. Guarda `resultSnapshot` y marca el envío como `PROCESSED`.
9. Registra en `AuditLog` solo identificadores internos y el resultado agregado, sin nombres ni documentos.

La validación y la inserción no son atómicas entre sí; la garantía final la entrega el índice único parcial. Esto evita duplicados aunque dos apoderados confirmen el mismo par al mismo tiempo.

Alternativas descartadas:

- Transacción única para todo el lote: un par inválido obligaría a revertir los válidos, contra el requisito de resultado parcial.
- Solo bloqueo del botón en el cliente: no protege cortes de red ni reintentos.

### 6. Documentos y privacidad

- Los archivos se guardan en `UPLOAD_DIR`, fuera de `public/`, con nombre aleatorio y sin extensión derivada del nombre original.
- Se valida MIME y tamaño máximo de 10 MB. Se aceptan JPEG, PNG y PDF.
- `deleteAfter` se calcula con `RETENTION_DAYS` (365 por defecto). Un job posterior elimina los archivos vencidos; este change solo registra la fecha.
- `GET /api/documents/:id` exige sesión. Un apoderado solo accede a documentos de sus propios envíos; un administrador accede a cualquiera. La respuesta usa `Content-Disposition: attachment` y `Cache-Control: no-store`.
- En modo demo, el documento simulado se marca con `isSimulated = true` para que no se confunda con evidencia real.
- **No se cifra en reposo en este change.** La interfaz `DocumentStorage` deja el punto de extensión para el change de seguridad. Antes de producción, el cifrado es obligatorio.
- Los logs usan Pino y solo incluyen `submissionId`, `eventId`, `studentId`, `authorizationId`, códigos de resultado y duración.

Alternativas descartadas:

- Cifrar ahora: agrega gestión de claves, rotación y migración de archivos, y desvía el foco del flujo.
- Guardar en `public/`: expone documentos por URL, prohibido por las reglas del proyecto.

### 7. Fechas, zona horaria y ventanas

- `startsAt`, `endsAt`, `deadlineAt` y `signedAt` se guardan como `timestamptz` en UTC.
- Un módulo compartido `src/shared/dates.ts` expone `now()`, `formatInSantiago()`, `startOfMonthInSantiago()` y `startOfNextMonthInSantiago()`. Usa `date-fns` con `@date-fns/tz` para evitar conversiones manuales; es la única dependencia nueva de fechas y se justifica porque los cálculos de mes y los cambios de horario de verano son una fuente típica de errores.
- Un evento permite firmar si `status = PUBLISHED`, `now < deadlineAt` y `now < endsAt`. La comparación usa el reloj del servidor, inyectado como `Clock` para los tests.
- La ventana del administrador va desde el inicio del mes actual en Santiago hasta el inicio del mes subsiguiente, e incluye eventos con `status` `PUBLISHED` o `CLOSED` cuyo `endsAt` sea futuro.
- El apoderado no tiene ventana de meses: ve todos los eventos publicados y vigentes, sin límite, como está en el spec.

Alternativas descartadas:

- Calcular meses con la zona del proceso: el contenedor corre en UTC y el colegio en Santiago; produciría desfases en los bordes de mes.
- Usar la hora del dispositivo: manipulable y contradictoria con la validación del servidor.

### 8. Interfaz y estado de la selección

Rutas del cliente:

| Ruta | Pantalla |
|---|---|
| `/login` | Acceso simulado por correo o teléfono |
| `/` | Inicio con **Firmar Autorización** y **Retiro Externo** deshabilitado |
| `/autorizaciones` | Eventos, estudiantes y selección |
| `/autorizaciones/resumen` | Resumen obligatorio y confirmación |
| `/autorizaciones/resultado` | Resultado total o parcial |
| `/admin/eventos` | Menú **Eventos** del administrador |
| `/admin/eventos/:id` | Detalle de pendientes |

- La selección vive en un `AuthorizationSelectionProvider` con `useReducer` y se persiste en `sessionStorage`. Así el apoderado puede volver del resumen sin perderla y recargar sin empezar de nuevo.
- Cada par se identifica por `eventId:studentId`. El contador se deriva del tamaño del mapa, por lo que no puede desincronizarse.
- La pantalla de resumen se protege: si no hay pares, redirige a la selección con un mensaje.
- En modo demo no existe pantalla de captura. El resumen muestra el aviso **Documento simulado en modo demostración** y el botón **Confirmar autorización** envía el lote directamente.
- El resultado parcial lista los pares creados y los fallidos con su motivo, y ofrece **Volver a los eventos**. Los pares ya autorizados se muestran como **Ya autorizada** y los eventos completos como **Estudiantes Autorizados**.
- El menú del administrador usa TanStack Query con invalidación al cambiar filtros. El detalle muestra el estado del evento y no ofrece acciones de firma.
- Todo el texto visible está en español de Chile, con tildes y UTF-8.

Alternativas descartadas:

- Guardar la selección solo en memoria: se pierde al volver del resumen o al recargar en el navegador de WhatsApp.
- Deducir `allAuthorized` en el cliente: duplicaría la regla de aplicabilidad.

### 9. Datos de demostración

`prisma/seed.ts` es idempotente y usa UUID fijos para que los tests E2E sean deterministas.

- 1 administrador con correo y teléfono.
- 3 apoderados: dos con dos estudiantes y uno con un estudiante. Uno comparte un estudiante con otro apoderado para probar **Ya autorizada**.
- 4 cursos y alrededor de 10 estudiantes activos.
- 5 eventos: uno publicado del mes actual, uno publicado del mes siguiente, uno cerrado del mes siguiente, uno en borrador y uno cancelado.
- Inclusiones y exclusiones individuales en al menos un evento.
- Una autorización vigente preexistente y una anulada, para mostrar ambos estados.
- El seed imprime las cuentas de demostración en la consola y la pantalla de login las muestra cuando `DEMO_MODE` está activo.

### 10. Estrategia de tests

- **Unitarios (Vitest)**: aplicabilidad con cursos, inclusiones y exclusiones; regla de firma con reloj fijo; exclusión de pares ya autorizados; armado del resumen; mapeo de resultado parcial; cálculo de contadores del administrador; helpers de mes y zona horaria, incluido un evento a las 23:30 y un cambio de mes.
- **Integración (Vitest + PostgreSQL)**: migraciones y seed; índice único parcial; idempotencia con la misma clave; concurrencia de dos envíos sobre el mismo par; permisos de apoderado y administrador; acceso a documentos; retención registrada.
- **E2E (Playwright)**: flujo mínimo de un evento y un estudiante; varios estudiantes; todos los eventos; resultado parcial simulado; menú y detalle del administrador con filtro por curso.
- **Línea base**: antes del scaffold no existen `pnpm test`, `pnpm typecheck` ni `pnpm build`; la primera tarea del change crea los scripts y deja constancia de que la línea base era inexistente.

## Risks / Trade-offs

- **El modo demo llegue a producción** → el arranque falla con `DEMO_MODE=true` y `NODE_ENV=production`; el seed solo corre con el modo activo; el documento simulado se marca con `isSimulated`.
- **El índice parcial no esté en el schema de Prisma y se pierda en una migración futura** → se crea con SQL en la migración inicial y un test de integración verifica que el duplicado vigente falla.
- **La evidencia del modo demo no sirva como respaldo legal** → `isSimulated` lo distingue y la captura real es obligatoria antes del piloto.
- **Documentos sin cifrado** → almacenamiento privado, endpoint autorizado y `no-store`; el cifrado se exige antes de producción.
- **Resultado parcial confuso para el apoderado** → el resultado separa creados y fallidos, explica el motivo de cada fallo y ofrece volver a los eventos.
- **Reintentos con claves distintas generen duplicados** → el índice único parcial los bloquea y el resultado los informa como `ALREADY_AUTHORIZED`.
- **Envíos muy grandes** → se limita a 100 pares por envío; en la práctica el máximo está acotado por los estudiantes del apoderado.
- **Desfase de zona horaria en los bordes de mes o en eventos nocturnos** → helpers compartidos, reloj inyectado y tests con casos de borde.
- **Datos de demostración mezclados con datos reales** → UUID fijos, seed idempotente y ejecución condicionada a `DEMO_MODE`.

## Migration Plan

1. Crear el scaffold, la configuración validada y los scripts de `package.json`.
2. Crear la migración inicial con todas las tablas, índices y el índice único parcial en SQL.
3. Ejecutar `prisma migrate deploy` y, solo con `DEMO_MODE=true`, `prisma db seed`.
4. Levantar PostgreSQL con `docker compose up -d` y verificar el flujo con los datos de demostración.
5. Rollback en desarrollo: `prisma migrate reset` y volver a sembrar. No hay datos productivos que preservar.
6. Antes de producción: desactivar `DEMO_MODE`, implementar OTP real, captura real y cifrado de documentos en changes posteriores.

## Open Questions

- El proveedor definitivo de WhatsApp y el formato del mensaje quedan para el change de OTP; no cambian este diseño.
- La estrategia de cifrado y rotación de claves queda para el change de seguridad; la interfaz `DocumentStorage` ya reserva el punto de extensión.
- La interfaz de anulación administrativa queda para un change posterior; este diseño solo garantiza que una autorización anulada vuelva a contar como pendiente.
