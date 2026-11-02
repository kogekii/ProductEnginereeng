# Tasks

## 1. Línea base y scaffold

- [x] 1.1 Ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build` para registrar la línea base; como el repositorio aún no tiene `package.json`, dejar constancia escrita de que la línea base es inexistente y guardar la salida de los comandos.
- [x] 1.2 Crear `package.json`, `tsconfig.json` estricto, ESLint, Prettier y los scripts `dev`, `build`, `start`, `test`, `test:e2e`, `typecheck`, `lint`, `format`, `db:migrate`, `db:seed` y `db:studio`; verificar con `pnpm install`, `pnpm typecheck` y `pnpm build` sobre el esqueleto.
- [x] 1.3 Implementar `src/server/config.ts` con validación Zod de las variables de entorno y `src/server/app.ts` con Pino, manejo de errores y `GET /api/health`; verificar con un test de integración que la configuración inválida falla al arrancar y que `/api/health` responde `200`.
- [x] 1.4 Crear `docker-compose.yml` con PostgreSQL 17, `.env.example` sin secretos reales y un `README.md` con los comandos de instalación, migración, seed y ejecución; verificar con `docker compose config` y ejecutando los comandos documentados en una base local.
- [x] 1.5 Definir el schema Prisma completo de `design.md` (usuarios, sesiones, cursos, estudiantes, vínculos, eventos, excepciones, documentos, envíos, autorizaciones y auditoría) y la migración inicial; incluir el índice único parcial `(event_id, student_id) WHERE status = 'SIGNED'` en SQL y verificar con un test de integración que un segundo `SIGNED` falla y que un `ANNULLED` más un nuevo `SIGNED` se permite.

## 2. Autenticación de demostración y datos de prueba

- [x] 2.1 Implementar el módulo `auth`: `POST /api/auth/demo-login` por correo o teléfono normalizado, `POST /api/auth/logout`, `GET /api/auth/me`, sesión con token hasheado y cookie `httpOnly`, y guardas de rol; verificar con tests de integración de credencial válida, credencial inexistente, cookie ausente y acceso de administrador.
- [x] 2.2 Implementar el bloqueo de arranque cuando `DEMO_MODE=true` y `NODE_ENV=production`, y el bloque de cuentas de demostración visible solo en modo demo; verificar con tests unitarios de la configuración y un test de la pantalla de login.
- [x] 2.3 Escribir `prisma/seed.ts` idempotente con UUID fijos: un administrador, tres apoderados, cuatro cursos, diez estudiantes, cinco eventos en distintos estados, inclusiones y exclusiones, una autorización vigente y una anulada; verificar ejecutando `pnpm db:seed` dos veces y comprobando que los conteos no cambian.
- [x] 2.4 Crear la pantalla `/login`, el contexto de sesión y la protección de rutas del cliente; verificar con un test E2E que un apoderado del seed entra con su correo o teléfono y que un identificador desconocido muestra un mensaje en español de Chile sin crear sesión.

## 3. Eventos y aplicabilidad

- [x] 3.1 Implementar los helpers compartidos de fecha y zona horaria (`now`, `formatInSantiago`, `startOfMonthInSantiago`, `startOfNextMonthInSantiago`) con reloj inyectable; verificar con tests unitarios de un evento a las 23:30, del cambio de mes y del cambio de horario de verano.
- [x] 3.2 Implementar `EventApplicabilityService` con la fórmula de cursos, inclusiones y exclusiones, y la regla de firma `PUBLISHED` con fecha límite y término futuros según el servidor; verificar con tests unitarios de cada combinación y de un evento vencido por un minuto.
- [x] 3.3 Implementar `GET /api/guardian/authorizations/events` con eventos aplicables, estudiantes vinculados, marca `alreadyAuthorized` y `allAuthorized`; verificar con tests de integración que no aparecen eventos en borrador, cerrados, cancelados, vencidos ni de estudiantes de otro apoderado, y que un evento completo se marca como **Estudiantes Autorizados**.
- [x] 3.4 Implementar el listado de eventos del apoderado en `/autorizaciones` con nombre, fecha, fecha límite, marca **Ya autorizada**, marca **Estudiantes Autorizados** y mensaje cuando no hay eventos; verificar con tests de componente y un E2E con los datos del seed.

## 4. Documentos de identidad

- [x] 4.1 Implementar la interfaz `DocumentStorage` y el almacenamiento local privado en `UPLOAD_DIR`, con nombre aleatorio, validación de MIME y tamaño máximo de 10 MB, hash SHA-256 y `deleteAfter` calculado con `RETENTION_DAYS`; verificar con tests unitarios de archivo válido, archivo demasiado grande, MIME rechazado y ruta fuera de `public/`.
- [x] 4.2 Implementar `SimulatedDocumentProvider` para el modo demo, que crea un `Document` con `isSimulated = true` y un archivo de relleno en el almacenamiento privado; verificar con un test de integración que el documento se crea una sola vez por envío y que el archivo no es accesible por URL pública.
- [x] 4.3 Implementar `POST /api/documents` para la carga previa y `GET /api/documents/:id` con autorización de dueño o administrador, `Content-Disposition: attachment` y `Cache-Control: no-store`; verificar con tests de integración de apoderado dueño, apoderado ajeno, administrador y solicitud sin sesión.
- [x] 4.4 Verificar que los logs de carga y lectura de documentos solo registran identificadores internos, sin nombres, documentos ni rutas; agregar un test que inspeccione la salida del logger.

## 5. Envío de autorizaciones

- [x] 5.1 Definir en `src/shared` los schemas Zod del envío y el catálogo de errores estables (`AUTH_REQUIRED`, `FORBIDDEN`, `INVALID_SELECTION`, `STUDENT_NOT_LINKED`, `STUDENT_NOT_APPLICABLE`, `EVENT_NOT_SIGNALABLE`, `DEADLINE_PASSED`, `ALREADY_AUTHORIZED`, `PAIR_DUPLICATED`); verificar con tests unitarios de payload válido, lote vacío, par repetido y más de 100 pares.
- [x] 5.2 Implementar `AuthorizationSubmissionService` con la validación por par de vínculo, aplicabilidad, estado del evento y fecha límite, y el resultado parcial con creados y fallidos; verificar con tests unitarios que cubran cada código de fallo y un lote mixto.
- [x] 5.3 Implementar la persistencia del envío, la idempotencia por `(guardianId, idempotencyKey)` con `resultSnapshot`, y el manejo del choque con el índice único parcial como `ALREADY_AUTHORIZED`; verificar con tests de integración de reintento con la misma clave, dos envíos concurrentes sobre el mismo par y una autorización anulada que permite firmar de nuevo.
- [x] 5.4 Implementar `POST /api/guardian/authorizations/submissions` con `200` para resultado parcial, `400` para lote inválido, `401` sin sesión y `403` para rol no autorizado; verificar con tests de integración de la forma de la respuesta y de los códigos HTTP.
- [x] 5.5 Guardar por autorización el snapshot del texto, su hash y el snapshot del resumen con evento, fecha, estudiante, propósito, fecha límite y total del envío; verificar con un test que dos autorizaciones del mismo envío comparten documento pero tienen evidencia y snapshot propios.

## 6. Interfaz del apoderado

- [x] 6.1 Implementar `AuthorizationSelectionProvider` con `useReducer`, pares identificados por `eventId:studentId`, persistencia en `sessionStorage` y contador derivado; verificar con tests unitarios de seleccionar, desmarcar, evitar duplicados y conservar la selección al recargar.
- [x] 6.2 Implementar la selección por evento con **Seleccionar todos**, exclusión de pares ya autorizados y deshabilitado cuando no quedan pendientes; verificar con tests de componente que **Seleccionar todos** nunca incluye estudiantes de otro apoderado.
- [x] 6.3 Implementar la pantalla de resumen obligatorio con todos los pares, el aviso **Documento simulado en modo demostración** y el regreso a la selección sin perderla; verificar con un test de componente que no se puede confirmar sin pasar por el resumen y que el resumen refleja los cambios de selección.
- [x] 6.4 Implementar la confirmación en modo demo sin pantalla de captura y la pantalla de resultado con creados, fallidos y motivo por par; verificar con un E2E del flujo mínimo de un evento y un estudiante y con un E2E de resultado parcial.
- [x] 6.5 Ajustar las pantallas a mobile-first con áreas táctiles amplias, textos en español de Chile y tildes correctas; verificar con un E2E en viewport móvil y una revisión de que no hay texto sin tildes en la interfaz.

## 7. Seguimiento del administrador

- [x] 7.1 Implementar `AdminTrackingService` con la ventana del mes actual y el siguiente en `America/Santiago`, estados `PUBLISHED` y `CLOSED` no ocurridos, filtro por uno o varios cursos y contadores de aplicables y pendientes; verificar con tests unitarios de eventos fuera de ventana, eventos ya ocurridos, filtro múltiple y autorización anulada que vuelve a contar.
- [x] 7.2 Implementar `GET /api/admin/events` y `GET /api/admin/events/:id/pending` con validación de rol en el servidor y datos de contacto de los apoderados; verificar con tests de integración de apoderado rechazado, administrador autorizado, coherencia entre contador y listado y evento sin pendientes.
- [x] 7.3 Implementar el menú **Eventos** y el detalle de pendientes en el dashboard, con filtro por curso, estado del evento, marca de completo y mensaje cuando no hay pendientes; verificar con tests de componente y un E2E del flujo del administrador.
- [x] 7.4 Verificar que el menú y el detalle no muestran documentos de identidad y que los logs de consulta no incluyen nombres ni datos de contacto; agregar un test que inspeccione la respuesta y la salida del logger.
- [x] 7.5 Añadir **Cerrar sesión** a la cabecera del dashboard administrativo; llamar al endpoint de logout, revocar la sesión, limpiar la cookie y la caché de consultas, y redirigir a `/login`. Verificar con un E2E que tras cerrar sesión no se puede volver al dashboard ni consultar sus APIs.

## 8. Integración y verificación final

- [x] 8.1 Ejecutar la suite E2E completa de los flujos 1, 1.2, 2 y 3 en viewport móvil y de escritorio con los datos del seed; verificar con `pnpm test:e2e` sin fallos.
- [x] 8.2 Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm build` y `pnpm lint`; verificar que los cuatro comandos terminan sin errores y adjuntar la salida al cierre del change.
- [x] 8.3 Revisar las reglas 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 25 y 27 de `docs/00-producto.md` contra los tests y el comportamiento implementado; verificar que cada regla tiene al menos un test o una comprobación E2E asociada.
- [x] 8.4 Verificar que no se rompió ninguna decisión del stack ni del producto, que `DEMO_MODE` no puede activarse en producción, que no hay secretos en el repositorio y que los documentos no tienen URL pública; dejar el resultado en una nota de cierre del change.

## Workflow follow-up

### Registro de línea base — 2026-11-02

- `pnpm test`: sin línea base; `pnpm` no estaba en PATH. Con Corepack: `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` (no existe `package.json`).
- `pnpm typecheck`: sin línea base; Corepack informa `Command "typecheck" not found`.
- `pnpm build`: sin línea base; Corepack informa `Command "build" not found`.
- `node --version`: `v24.14.1`; `corepack pnpm --version`: `12.16.1`.
- Al inicio, `docker compose` no estaba en PATH de PowerShell; se confirmó Docker disponible por WSL con Compose v5.1.1.
- Docker está disponible mediante WSL: `wsl.exe docker compose ...` (Compose v5.1.1). `docker compose config`, `db:migrate` y dos ejecuciones de `db:seed` pasaron; conteos antes/después: `[4 usuarios, 4 cursos, 10 estudiantes, 5 eventos, 2 autorizaciones]`.
- `prisma migrate diff --from-url ... --to-schema-datamodel prisma/schema.prisma --script`: migración y schema quedan alineados (`This is an empty migration`).
- `tests/integration/authorization-index.test.ts`: 1 test PostgreSQL pasó, verificando rechazo del segundo `SIGNED` y aceptación de nuevo `SIGNED` tras `ANNULLED`.
- Verificación final — 2026-11-02, 36/36 tareas: `pnpm test` 37/37, `pnpm typecheck`, `pnpm build`, `pnpm lint` y `pnpm test:e2e` 10/10 (desktop Chromium + móvil Chromium) pasaron con PostgreSQL 17 en WSL.
- Revisión de reglas: permisos de apoderado/administrador (pruebas auth y API); estados, aplicabilidad y excepciones (tests de servicios y PostgreSQL); unicidad/anulación e idempotencia/concurrencia (tests de índice y envío); resumen/documento/evidencia (componentes y E2E); fechas Santiago (tests de UTC, mes y DST); textos mobile-first en español revisados en las pantallas y E2E.
- Revisión de decisiones/seguridad del change: monolito Fastify/Prisma/PostgreSQL + React/Vite, español de Chile, modo demo bloqueado en producción; regex de secretos conocidos sin resultados; `.env`, uploads, builds y reportes ignorados por Git; documentos en `UPLOAD_DIR` privado, sin rutas públicas, y lectura solo por endpoint con permiso.
- Cierre de sesión admin: el E2E verifica redirección a `/login`, cookie ausente, API administrativa `401` y acceso directo al dashboard redirigido tras cerrar sesión.

- Ejecutar `openspec validate "student-authorization-signing" --strict` y archivar el change cuando la revisión esté aprobada.
- Verificar el change archivado y que `openspec list` ya no lo muestre como activo.
