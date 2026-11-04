# Design

## Context

Ver motivación y límites en `proposal.md`. Los contratos observables están en `specs/guardian-pickups/spec.md` y `specs/admin-pickup-review/spec.md`.

Estado observado antes de planificar:

| Área existente | Consecuencia para el diseño |
|---|---|
| `src/client/routes/App.tsx` muestra retiro como **Próximamente** | Habilitar enlace y rutas; no existe flujo de retiros que migrar. |
| `prisma/schema.prisma` no tiene solicitudes de retiro | Migración aditiva, no recrear el scaffold. |
| Sesiones, guardas `requireGuardian` y administrador | Reutilizar identidad y permisos; no implementar OTP real aquí. |
| `DocumentService` carga solo `GUARDIAN_IDENTITY` y accede directamente a Prisma | Extender tipos y extraer un puerto/repositorio acotado para esa operación compartida. |
| `DocumentStorage` admite JPG, PNG y PDF hasta 10 MB, almacenamiento privado | Reusar carga y descarga; no introducir otro almacén ni URLs públicas. |
| El flujo de autorizaciones puede generar documentos simulados | El nuevo flujo de retiros exige dos archivos adjuntados, incluso con login demo; no alterar las autorizaciones existentes. |
| `src/shared/dates.ts` tiene reloj y helpers Santiago | Agregar fechas civiles de retiro sin convertirlas como medianoches UTC. |
| React Query, estilos de marca y formularios controlados existentes | Reutilizar patrones; no añadir librería de calendario o formularios para esta entrega. |

Línea base verificada al iniciar la implementación: `pnpm` no está directamente en PATH; `corepack pnpm` usa la versión declarada. PostgreSQL está disponible en `localhost:5432`; `prisma migrate status` informa que la base `colegio` está actualizada con una migración. Al cargar `.env` en el proceso de Vitest sin imprimir sus valores, `node -r dotenv/config ./node_modules/vitest/vitest.mjs run` pasa 37/37 tests en 18 archivos; `corepack pnpm typecheck` y `corepack pnpm build` también pasan. La corrida de `corepack pnpm test` sin cargar dotenv conserva el antecedente conocido de 7 fallos por falta de `DATABASE_URL`/sesión.

## Goals / Non-Goals

**Goals:**

- Resolver el caso habitual sin repetir selección de estudiantes ni datos del externo por cada día, manteniendo excepciones explícitas.
- Proteger la integridad del lote en la base de datos, incluidos reintentos y dos apoderados del mismo estudiante.
- Incorporar solicitud y revisión como una unidad vertical reutilizando los módulos existentes.

**Non-Goals:**

- Cambiar el resultado parcial del flujo de autorizaciones de eventos: los retiros son atómicos por decisión de producto.
- Persistir borradores con identidad del externo o archivos en el navegador, o crear un motor genérico de workflows.
- Implementar cifrado, eliminación física programada, OTP real u otros componentes completos de seguridad. Son dependencias del piloto real ya documentadas en producto; se conserva `deleteAfter` y se impide descargar documentos vencidos o eliminados.

## Decisions

### 1. Selección por fecha con personalización progresiva

Nuevo estado de feature en `src/client/features/pickups/`, con reducer puro y provider acotado al trámite. Reglas de selección y validación en funciones compartidas de dominio, no en componentes de React.

- Cada fecha se representa como `YYYY-MM-DD`, con `studentIds` y marca de personalización.
- Al agregar o volver a agregar un día, sus estudiantes se inicializan con **todos** los activos vinculados. Los ajustes previos de otras fechas no cambian ese valor predeterminado.
- Una selección común permite aplicar el mismo conjunto a los días actuales no personalizados mediante una acción explícita. No se trata de una plantilla oculta para días agregados después.
- **Cambiar estudiantes por día** abre controles por fecha. Cambiar uno marca esa fecha como personalizada; una acción explícita permite volver a aplicar la selección común.
- Si la incorporación de un día produce una selección distinta de la común actual, se indica **Selección distinta** y sus nombres. Nunca mostrar una casilla común como si describiera todas las fechas cuando no es así.
- Selección vacía por día es un error recuperable; se puede corregir o quitar el día. No se borra la fecha automáticamente al desmarcar al último estudiante.
- Una fecha quitada pierde su asignación; las demás conservan la suya. En el resumen los pares se ordenan por fecha y nombre.

Se descarta repetir un formulario por día: aumenta acciones para el caso común. También se descarta incluir a todos sin mostrar sus nombres: ahorra clics, pero impide reconocer qué se está autorizando.

### 2. Fechas civiles y autoridad del servidor

Agregar helpers a `src/shared/dates.ts` para obtener fecha local de hoy, ventana de meses y elegibilidad, con reloj inyectable. Usar las dependencias de fechas ya instaladas.

- `GET /api/guardian/pickups/context` entrega `today`, `currentMonth`, `nextMonth`, límites y días elegibles, calculados en Santiago, además de los estudiantes activos vinculados.
- La UI representa estos días; no decide fines de semana ni ventana por su cuenta. Refresca el contexto al recuperar foco y al volver al paso de fechas; el servidor siempre revalida al confirmar.
- `pickupDate` se almacena como PostgreSQL `date`, no `timestamptz`. Serializar y ordenar como fecha civil; nunca aplicar `formatInSantiago()` a `new Date('YYYY-MM-DD')`, que puede moverla al día anterior.
- Los registros de envío/revisión sí usan UTC con visualización Santiago.
- No se consulta un servicio de feriados ni se agrega `PICKUP_WINDOW_DAYS`.

Se descartan la ventana móvil de 60 días y la hora del dispositivo por ser incompatibles con la definición acordada. Cubrir último día de mes, diciembre/enero, febrero y cambio de hora.

### 3. Modelo aditivo y exclusividad activa

Todos los nombres de tablas/campos físicos usan `snake_case`, IDs UUID y relaciones sin borrado en cascada del historial.

| Modelo propuesto | Datos y garantías |
|---|---|
| `PickupRequest` | `guardianId`, `guardianDocumentId`, `idempotencyKey`, `payloadHash`, `summarySnapshot`, `sessionId`, IP/user agent, `submittedAt`, `status`, `reviewedById?`, `reviewedAt?`, `rejectionReason?`. Único por apoderado/clave; documento del apoderado único entre solicitudes. |
| `ExternalPerson` | `requestId` único, nombres, apellidos, tipo/número normalizado, vínculo y `documentId` único. Exactamente uno se crea junto a cada solicitud. |
| `PickupItem` | `requestId`, `studentId`, `pickupDate`. Único por solicitud/estudiante/fecha; el externo proviene de la solicitud. |
| `PickupActiveSlot` | Reserva activa con clave única estudiante/fecha, `itemId` único y referencia al detalle. Solo existe mientras la solicitud está pendiente o aprobada. |

La tabla de reservas evita índices parciales que dependan del estado de otra tabla. Una clave única protege el par sin importar quién sea el apoderado. Agregar claves foráneas que garanticen que la reserva corresponde al estudiante y fecha del detalle referenciado; no permitir reservas inconsistentes mediante IDs independientes.

Rechazar elimina solo reservas, nunca solicitudes, detalles, documentos ni auditorías. Aprobar conserva las reservas. Todas las mutaciones de estado/reservas pasan por el mismo repositorio transaccional. El estado `CANCELLED` del modelo conceptual puede reservarse, pero no se expone una acción de cancelación en esta entrega.

Índices de lectura: solicitud por apoderado/fecha de envío y estado/fecha de envío; detalle por fecha/solicitud y por estudiante/fecha. Limitar y paginar listados a 20 por página, máximo 100; orden estable por fecha de envío e ID. El filtro administrativo de fecha usa existencia de un detalle de ese día y no duplica solicitudes en la página.

Se descartan validaciones de unicidad solo en memoria y un booleano de actividad duplicado en cada detalle: son más fáciles de desincronizar del estado del lote.

### 4. Contratos y responsabilidades

Schemas Zod de entrada y respuesta en el archivo propuesto `src/shared/pickup.ts`, siguiendo la organización plana actual de `authorization.ts`. Validar fechas reales, UUID, campos recortados, RUT con dígito verificador y pasaporte no vacío. Crear helpers de identidad compartidos si no existen; no incorporar SDK de verificación.

| Método y ruta propuesta | Responsabilidad |
|---|---|
| `GET /api/guardian/pickups/context` | Contexto elegible para el apoderado autenticado. |
| `POST /api/guardian/pickups` | Crear el lote completo o devolver errores recuperables. |
| `GET /api/guardian/pickups` | Listado paginado de solicitudes propias. |
| `GET /api/guardian/pickups/:id` | Detalle propio y estado actual. |
| `GET /api/admin/pickups?date=YYYY-MM-DD&status=...` | Listado paginado; ambos filtros son opcionales y combinables. |
| `GET /api/admin/pickups/:id` | Lote completo, aun viniendo de un filtro de fecha. |
| `POST /api/admin/pickups/:id/review` | `{ decision: 'APPROVE' | 'REJECT', reason?: string }`. |
| `POST /api/documents?type=...` | Extender la carga existente, preservando el tipo apoderado como valor por defecto para compatibilidad. |
| `GET /api/documents/:id` | Mantener lectura privada con permisos ampliados para relaciones de retiros. |

Cuerpo conceptual del envío:

```json
{
  "idempotencyKey": "uuid",
  "guardianDocumentId": "uuid",
  "externalPerson": {
    "firstName": "Nombres",
    "lastName": "Apellidos",
    "documentType": "RUT",
    "documentNumber": "RUT con dígito verificador",
    "relationship": "Vínculo",
    "documentId": "uuid"
  },
  "days": [{ "date": "YYYY-MM-DD", "studentIds": ["uuid"] }]
}
```

La sesión determina al apoderado; no aceptar `guardianId`, estado ni revisor desde el cliente. Días o estudiantes repetidos se rechazan, no se deduplican silenciosamente. No imponer un límite de 100 pares heredado de autorizaciones: la ventana de dos meses y los estudiantes vinculados son el límite funcional; dimensionar el límite HTTP para el volumen del colegio sin truncar lotes válidos.

Responder `201` al crear con ID y estado; reintento idéntico `200` con la misma identidad y estado actual. No prometer que una respuesta antigua seguirá diciendo pendiente tras una revisión. Errores: `400 INVALID_SELECTION` / `INVALID_EXTERNAL_PERSON` / `INVALID_DOCUMENT`, `401 AUTH_REQUIRED`, `403 FORBIDDEN`, `404 PICKUP_NOT_FOUND`, `409 PICKUP_CONFLICT` / `IDEMPOTENCY_CONFLICT` / `REVIEW_CONFLICT`, `422 PICKUP_DATES_EXPIRED`. Incluir errores por fecha/campo sin nombres de otro apoderado. Concurrencia agotada devuelve `503 RETRYABLE_ERROR`, sin crear resultados parciales.

Nuevos servicios `PickupRequestService` y `PickupReviewService` dependen de puertos pequeños de repositorio, documentos y reloj. Los repositorios encapsulan Prisma, transacciones y reservas. Las rutas validan y serializan. Para documentos, extraer solo su acceso Prisma a repositorio al tocarlo, sin refactorizar módulos ajenos.

### 5. Envío atómico e idempotente

En una transacción corta del repositorio, sin subidas de archivos ni red externa:

1. Buscar `(guardianId, idempotencyKey)`. Si ya existe, comparar hash canónico del contenido y devolver su identidad/estado o `IDEMPOTENCY_CONFLICT`. Este reintento se resuelve antes de revalidar fechas hoy vencidas.
2. Revalidar todas las fechas con reloj del servidor, vínculos activos y un externo único. Canonizar orden de fechas/estudiantes y RUT para no confundir un cambio de orden con contenido distinto.
3. Bloquear ambos registros de documento en orden estable y verificar dueño, tipo correcto, archivo disponible, vigencia y no asociación a autorizaciones u otros retiros. No aceptar el mismo ID para ambos roles.
4. Crear solicitud, externo, todos los detalles y reservas. La clave única de reserva es la última defensa frente a carreras entre apoderados.
5. Guardar snapshot construido desde datos validados del servidor y auditoría `PICKUP_SUBMITTED`, con IDs y conteos en metadata; no nombres, documentos ni texto libre en logs.
6. Confirmar todo junto. Cualquier fallo revierte solicitud, externo, detalles, reservas y auditoría; los archivos cargados previamente siguen disponibles para corregir/reintentar.

Usar transacciones Prisma 6 con aislamiento `Serializable` y reintentos acotados (hasta tres) de `P2034`. Para colisión de clave de idempotencia, recuperar la solicitud ganadora después del rollback y comparar hash. Para colisión de reservas, volver a consultar los conflictos de los pares propios y responder `PICKUP_CONFLICT`. No convertir cualquier error único en el mismo error de negocio.

La misma clave se conserva al repetir por red; una edición del contenido confirmado crea otra clave. Un rechazo de validación sin solicitud persistida no consume la clave. No reintentar automáticamente conflictos de negocio.

Se descarta reutilizar el servicio de autorizaciones: admite éxito parcial y documentos simulados, incompatibles con retiros.

### 6. Documentos ordenados y compatibles

- Extender `POST /api/documents` con query `type=GUARDIAN_IDENTITY|EXTERNAL_IDENTITY`. Para subir el externo, exigir `guardianDocumentId` en query; validar que el documento previo sea del usuario, de tipo apoderado, no esté consumido y no haya vencido.
- Añadir a `Document` una relación opcional `predecessorDocumentId` para recordar a qué documento del apoderado corresponde la carga externa. El envío verifica esa relación y tipos, no solo timestamps o estado del navegador.
- Si se reemplaza el documento del apoderado, se invalida la referencia al documento externo del formulario y se pide cargarlo después del nuevo. Corregir nombres o fechas no obliga a recargar archivos válidos. Ambos IDs pertenecen al apoderado solicitante; el externo no es un usuario.
- Mantener JPG/PNG/PDF y 10 MB, validación de firma de archivo y descarga `attachment`/`no-store`. No forzar cámara: ofrecer cámara y selector de archivo como opciones separadas.
- Para impedir consumo simultáneo del mismo documento entre retiros y autorizaciones, usar el mismo bloqueo de fila y consulta de asociaciones en ambos repositorios al reclamarlo. La adaptación del repositorio de autorizaciones se limita a esa reclamación; conserva resultados parciales y demo. Probar expresamente esta carrera cruzada.
- La reclamación incrementa `Document.claimVersion` bajo transacción serializable en orden estable. El cambio de versión vuelve visible la contención de escritura para PostgreSQL/Prisma; un `SELECT FOR UPDATE` aislado no basta porque los dos flujos agregan asociaciones en tablas distintas. El error de serialización al ejecutar SQL crudo llega como `P2010` con SQLSTATE `40001`, mientras el conflicto de Prisma puede aparecer como `P2034`; ambos se reintentan de forma acotada.
- `deleteAfter` sigue registrándose con la configuración existente (365 días por defecto). Denegar lectura de archivos vencidos o con `deletedAt`; mostrar documento no disponible. El job de eliminación física y el cifrado siguen pendientes en el alcance de seguridad ya declarado, sin alterar `isEncrypted` para simular cumplimiento.
- No guardar archivos, URLs temporales, nombres ni RUT en logs o almacenamiento persistente del navegador. No borrar archivos por un simple error transitorio ni al rechazar una solicitud: forman parte de la evidencia hasta su retención.

Se descarta un borrador persistido en servidor para coordinar las dos cargas: una relación de precedencia alcanza para este flujo y no agrega un nuevo estado de solicitud.

### 7. Revisión por lote con transición única

`PickupReviewService` exige rol administrador en el servidor y opera sobre todo el lote. Revisión mediante actualización condicional `status = PENDING_REVIEW`, en transacción con reservas y auditoría.

- Aprobar: verificar ambos documentos disponibles y ninguna fecha anterior a hoy en Santiago; se admite revisión el mismo día del retiro, sin inventar una hora de corte. Actualizar revisor y hora, conservar reservas y registrar `PICKUP_APPROVED`.
- Rechazar: exigir motivo recortado no vacío (máximo 1000 caracteres), actualizar revisor y hora, liberar todas las reservas y registrar `PICKUP_REJECTED`. Guardar el motivo en la solicitud, no en logs ni metadata personal.
- Si ya no está pendiente, devolver `REVIEW_CONFLICT` y refrescar el detalle; no sobrescribir ni duplicar auditorías. Rechazar es posible aunque el lote tenga fechas vencidas.
- Tras decidir, invalidar consultas administrativas. El apoderado recupera estado al abrir/revisitar o refrescar sus solicitudes; no se introduce polling, WebSocket ni correo.

Se descarta aprobar solo las fechas futuras de un lote vencido: contradice la unidad de revisión. Dirección puede rechazar indicando que se vuelva a solicitar para días futuros.

### 8. Pantallas y estado local mínimo

| Ruta propuesta | Contenido |
|---|---|
| `/retiros` | Calendario directo, selección común visible y personalización colapsada; enlace **Mis solicitudes**. |
| `/retiros/externo` | Datos del externo y carga secuencial de los dos documentos con estados independientes. |
| `/retiros/resumen` | Resumen obligatorio actualizado y **Enviar solicitud**. |
| `/retiros/solicitudes` y `/retiros/solicitudes/:id` | Historial propio, resultado y estado consultable desde servidor. |
| `/admin/retiros` y `/admin/retiros/:id` | Filtros, detalle completo, documentos y decisión por lote. |

El provider conserva formulario, referencias a documentos y clave de idempotencia en memoria al navegar entre pasos. No persistir datos de identidad en `sessionStorage` ni prometer recuperación de archivos tras recargar. En una recarga de un paso sin borrador, redirigir con explicación al calendario; el historial enviado sí se recupera del servidor. Tras éxito, navegar al detalle devuelto y limpiar el borrador; salir/cerrar sesión limpia también borrador y caché privada. No registrar el formulario en analytics.

Respetar `src/client/index.css` y skill de marca: Charis SIL 400/700, paleta institucional, superficies suaves, botones redondeados, foco contrastado y estados escritos. El calendario debe caber a 320 px con filas de al menos 48 px de alto, botones semánticos y nombre accesible con fecha completa, estado seleccionado e inhabilitado. Semana de lunes a domingo; celdas fuera del mes se muestran vacías, no como fechas adicionales navegables. Los otros controles táctiles mantienen al menos 48 px de alto.

Una única acción primaria por paso; el camino sin excepciones no abre el editor por día ni pide un motivo libre de retiro. Mensajes clave: **Todos tus estudiantes están incluidos**, **Cambiar estudiantes por día**, **Documento del apoderado**, **Documento del externo** y **Solicitud recibida. Pendiente de revisión del colegio**. No usar el texto de autorizaciones de eventos que declara validez inmediata.

### 9. Verificación y evidencia de valor

| Nivel | Casos que debe verificar |
|---|---|
| Unitarios compartidos | Fechas reales, zona, bordes de mes/año/DST, feriado sin diferencia, RUT, inicialización de todos, ajuste común y personalizado, día nuevo y vacío. |
| Integración PostgreSQL | Migración y reservas; conflictos entre apoderados; rollback total; idempotencia concurrente y distinta carga; documentos ajenos, mal tipados, precedencia y consumo cruzado; permisos; rechazo libera; revisión concurrente, vencida y auditada. |
| Cliente | Dos meses y conservación al navegar; nombres predeterminados visibles; ajustes sin pérdida; cargas ordenadas y reintento; resumen actualizado; estados propios y filtros/detalle administrativo. |
| E2E Playwright | Apoderado selecciona días de ambos meses y ajusta un estudiante en una fecha, carga dos archivos ficticios y envía; dirección abre ambos documentos y aprueba; apoderado consulta aprobado. Segundo caso rechaza con motivo y permite un nuevo lote. |

Además, correr regresión de autorizaciones de eventos y descarga de documentos. Usar datos sintéticos y reloj fijo; concurrencia real contra PostgreSQL, no solo repositorios en memoria. Comprobar invariantes de reservas e historial tras cada carrera.

Prueba de usabilidad propuesta (no evidencia ya obtenida): observar un caso simple y otro con excepción por fecha, medir tiempo desde abrir **Retiro Externo** hasta confirmación y registrar errores/abandono. Criterio inicial: el caso simple no exige tocar casillas de estudiantes ni repetir campos/documentos por día, y la persona distingue recibido de aprobado. No fijar una promesa de segundos sin medición con apoderados.

## Risks / Trade-offs

- **Selección predeterminada demasiado amplia** → nombres visibles desde calendario, ajuste opcional y resumen obligatorio; validar comprensión con apoderados.
- **Día nuevo no coincide con selección común previa** → mostrar la diferencia y mantener todos por defecto, conforme a la decisión explícita.
- **Pérdida de borrador al recargar** → estado preservado entre pasos, mensaje al reiniciar y solicitudes enviadas recuperables; persistencia de borrador queda fuera.
- **Base de integración no preparada** → resolver entorno antes de implementar; no cerrar con tests rojos ni dar por omitida la integración crítica.
- **Privacidad incompleta del almacenamiento existente** → documentar límites: privado no equivale a cifrado. No considerar este change habilitación para operación con identidades reales antes del cifrado y eliminación programada exigidos por producto.
- **Adaptar documentos afecta autorizaciones** → extensión compatible por defecto, repositorio acotado y regresiones específicas de cargas y reclamación concurrente.

## Migration Plan

1. Disponer de PostgreSQL de pruebas, resolver variables por el mecanismo del proyecto sin commitear secretos, aplicar migraciones vigentes y seed de demostración; registrar línea base real.
2. Crear migración aditiva de las cuatro tablas, enum de estados, índices, FKs y precedencia opcional en `Document`. Verificar que no altera ni borra autorizaciones existentes.
3. Implementar contratos, repositorios y API; después integrar cliente y tests del circuito completo. Añadir fixtures sintéticos de retiros al seed solo en demo.
4. Ejecutar tests, typecheck, build y E2E con archivos ficticios; confirmar reglas de producto y revisar móvil/WhatsApp.
5. Reversión de aplicación: volver al build anterior, conservando tablas nuevas e historial. No usar reset ni borrar solicitudes. Si aún no hay datos de retiro, una reversión de esquema separada puede evaluarse; no hacer downgrade destructivo automático.
6. Antes del piloto con identidades reales, completar las dependencias de seguridad/documentos ya identificadas; no confundir login demo y fixtures con evidencia real.
