# AGENTS.md

Guía operativa para agentes que trabajen en este repositorio.

> **Fuente de verdad funcional:** [`docs/00-producto.md`](docs/00-producto.md). Si este archivo y `00-producto.md` se contradicen, manda `00-producto.md` y hay que corregir este archivo.

---

## 1. Qué es este proyecto

Plataforma web para un colegio de educación básica en Chile. Permite que los apoderados firmen autorizaciones para eventos y autoricen retiros externos sin instalar una aplicación. El acceso es con OTP por WhatsApp o correo electrónico. Los profesores y administradores usan el mismo login, pero acceden a un dashboard.

- Un solo colegio.
- Aproximadamente 300 estudiantes.
- Baja concurrencia.
- Aplicación mobile-first.
- Debe funcionar en el navegador interno de WhatsApp.

---

## 2. Estado actual del repositorio

El repositorio cuenta con un monolito Fastify + React, Prisma, tests, autorizaciones con acceso de demostración y el flujo de retiro externo definido por `docs/00-producto.md`. Revisa el estado del change `external-pickup-requests` y sus tareas para distinguir código implementado de validaciones manuales pendientes.

La estructura de la sección 5 es objetivo; revisa los archivos existentes antes de planificar o implementar módulos nuevos.

No inventes archivos de aplicación que no existan. Si una tarea requiere código, primero debe existir una spec de OpenSpec que lo autorice.

---

## 3. Lectura obligatoria antes de trabajar

1. Lee `docs/00-producto.md`.
2. Lee `openspec/config.yaml`.
3. Si hay un change activo, lee su `proposal.md`, `specs/`, `design.md` y `tasks.md`.
4. Revisa las decisiones y reglas de negocio antes de tocar lógica.

---

## 4. Stack objetivo

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript estricto |
| Runtime | Node.js LTS (24 o superior) |
| Backend | Fastify 5 |
| ORM | Prisma |
| Base de datos | PostgreSQL 17 o superior |
| Validación | Zod |
| Logs | Pino |
| Frontend | React 19 |
| Bundler | Vite |
| Ruteo | React Router |
| Estado del servidor | TanStack Query |
| Formularios | React Hook Form + Zod |
| Estilos | Tailwind CSS + shadcn/ui |
| Tests | Vitest + Playwright |
| Lint y formato | ESLint + Prettier |
| Paquetes | pnpm |
| Despliegue | Docker Compose + Caddy |
| Correo | Resend |
| WhatsApp | Interfaz `OtpSender` con mock en desarrollo |

Decisiones que no se cambian sin justificación y actualización de `docs/00-producto.md`:

- Monolito TypeScript.
- Un solo paquete, no monorepo.
- Fastify + Prisma + PostgreSQL.
- React + Vite.
- Un solo origen en producción: Fastify sirve la API y el build de React.
- Revisión manual de cédulas, sin OCR.
- Firma electrónica simple con evidencia, sin firma avanzada.
- Un solo colegio, sin multi-tenant.
- Calendario de retiros sin bloqueo manual de fechas.

---

## 5. Estructura objetivo del repositorio

```text
/
├─ AGENTS.md
├─ docs/
│  └─ 00-producto.md
├─ openspec/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts
├─ public/
├─ scripts/
├─ src/
│  ├─ server/
│  │  ├─ app.ts
│  │  ├─ server.ts
│  │  ├─ config.ts
│  │  ├─ plugins/
│  │  ├─ modules/
│  │  │  ├─ auth/
│  │  │  ├─ students/
│  │  │  ├─ events/
│  │  │  ├─ authorizations/
│  │  │  ├─ pickups/
│  │  │  ├─ documents/
│  │  │  └─ admin/
│  │  ├─ lib/
│  │  └─ jobs/
│  ├─ client/
│  │  ├─ routes/
│  │  ├─ components/
│  │  ├─ features/
│  │  └─ lib/
│  └─ shared/
│     ├─ schemas/
│     ├─ types/
│     └─ constants/
├─ tests/
├─ docker-compose.yml
├─ Dockerfile
└─ package.json
```

Reglas de arquitectura:

- `route → service → repository (Prisma) → base de datos`.
- La lógica de negocio vive en servicios.
- Las rutas solo validan entrada, llaman al servicio y formatean la respuesta.
- Los componentes de React no contienen reglas de negocio.
- Los schemas de Zod viven en `src/shared` y se comparten entre frontend y backend.
- Los proveedores externos —OTP, correo, almacenamiento— se acceden mediante interfaces.

---

## 6. Idioma y cultura

- Toda la documentación, la interfaz y los mensajes al usuario se escriben en **español de Chile**.
- Usa UTF-8 y tildes correctamente. No escribas texto sin tildes ni reemplaces letras por ASCII.
- Usa términos locales: apoderado, estudiante, curso, colegio, retiro, cédula de identidad, educación básica.
- Los identificadores de código, nombres de tablas, columnas, endpoints y variables se escriben en inglés.
- Los comentarios de código y los mensajes de error visibles se escriben en español de Chile.
- No uses modismos de otros países ni traducciones automáticas que suenen artificiales.

Ejemplos:

| Español de Chile | Identificador en código |
|---|---|
| Apoderado | `Guardian` |
| Estudiante | `Student` |
| Curso | `Course` |
| Evento | `Event` |
| Autorización | `Authorization` |
| Retiro externo | `Pickup` |
| Externo | `ExternalPerson` |
| Documento | `Document` |
| Cédula de identidad | `IdentityDocument` |

---

## 7. Reglas de negocio críticas

El listado completo está en `docs/00-producto.md`, sección 8. Estas son las que más se rompen al modificar lógica:

1. Un apoderado solo puede ver y operar sobre sus estudiantes vinculados.
2. Un administrador puede ver todo, pero su rol se valida en el servidor.
3. Un evento solo es visible cuando está publicado.
4. Un evento aplica a sus cursos, más inclusiones, menos exclusiones.
5. Solo existe una autorización vigente por estudiante y evento; las anuladas se conservan y permiten una nueva firma.
6. Solo se firma antes de la fecha límite.
7. Antes de confirmar una autorización se muestra el resumen obligatorio.
8. La autorización requiere documento del apoderado y registra evidencia.
9. La autorización queda válida al enviarse; el administrador puede anularla con motivo.
10. El botón “todos los aplicables” nunca incluye estudiantes de otros apoderados.
11. El calendario muestra mes actual y siguiente; solo permite desde mañana de lunes a viernes en `America/Santiago`, sin bloqueo manual ni tratamiento de feriados.
12. Una solicitud incluye varios días y estudiantes, pero un solo externo por lote; por defecto cada día nuevo incluye a todos sus estudiantes activos, con ajuste opcional por día.
13. Cada día debe tener al menos un estudiante; el externo único debe tener documento.
14. Se sube primero el documento del apoderado y luego el del externo, una vez cada uno por solicitud.
15. Antes de enviar un retiro se muestra el resumen obligatorio.
16. Un retiro solo es válido si está aprobado por el administrador.
17. No puede haber dos solicitudes activas para el mismo estudiante y fecha; el envío es atómico e idempotente.
18. Los documentos de identidad se eliminan a los 12 meses.
19. Las autorizaciones y auditorías no se eliminan; se anulan con motivo.
20. Las fechas se muestran en `America/Santiago`.

---

## 8. OpenSpec

Este proyecto usa OpenSpec con el esquema `spec-driven`.

- `docs/00-producto.md` es la fuente de verdad funcional.
- `openspec/config.yaml` contiene las restricciones resumidas que guían los artefactos.
- Los specs de OpenSpec son deltas por cambio; no reemplazan `00-producto.md`.
- No edites los specs principales a mano. Usa los flujos de OpenSpec.
- Los artefactos de un change son: `proposal.md`, `specs/<capacidad>/spec.md`, `design.md` y `tasks.md`.

Comandos útiles:

```bash
openspec list
openspec list --specs
openspec status --change "<nombre-del-change>" --json
openspec instructions apply --change "<nombre-del-change>" --json
openspec validate "<nombre-del-change>"
openspec archive "<nombre-del-change>"
```

Flujo esperado:

1. Se propone un change con `/opsx-propose`.
2. Se revisan y aprueban los artefactos.
3. Se implementa con `/opsx-apply`.
4. Se valida y archiva con `/opsx-archive`.

Si una decisión de producto cambia:

1. Actualiza `docs/00-producto.md`.
2. Actualiza `openspec/config.yaml` si la decisión es una restricción de proyecto.
3. Recién después modifica el código o los artefactos.

No dupliques todo `00-producto.md` dentro de `openspec/config.yaml`. El contexto de OpenSpec debe ser un resumen de restricciones, no una copia.

---

## 9. Flujo obligatorio por spec

Un **spec** es una unidad de trabajo de OpenSpec: un change, una tarea o una especificación concreta.

### Al iniciar

1. Lee el spec y `docs/00-producto.md`.
2. Identifica qué reglas de negocio y qué decisiones podrían verse afectadas.
3. Ejecuta la línea base:
   ```bash
   pnpm test
   pnpm typecheck
   ```
4. Si no existen tests o el scaffold aún no está creado, deja constancia y no inventes una línea base falsa.

### Durante

1. Implementa en cambios pequeños.
2. Respeta SOLID y la separación rutas/servicios/repositorios.
3. Agrega o actualiza tests para cada regla de negocio tocada.
4. No mezcles refactorizaciones grandes con cambios funcionales.

### Al finalizar

1. Ejecuta:
   ```bash
   pnpm test
   pnpm typecheck
   pnpm build
   ```
2. Si el cambio afecta un flujo crítico, ejecuta los E2E correspondientes.
3. Verifica que no se vulneró ninguna regla de negocio.
4. Verifica que no se rompió ninguna decisión de `docs/00-producto.md`.
5. Actualiza la documentación si cambió una decisión.
6. No cierres el spec con tests rojos.

---

## 10. Checklist al modificar lógica

Antes de dar por terminado un cambio, responde:

- ¿Qué regla de negocio de `docs/00-producto.md` toca este cambio?
- ¿Qué decisión de producto o de stack podría romper?
- ¿Existe un test que cubra esa regla? Si no, agrégalo.
- ¿El cambio afecta permisos de apoderado o administrador?
- ¿Afecta estados de evento, autorización o retiro?
- ¿Afecta fechas, zona horaria o cálculos de aplicabilidad?
- ¿Afecta documentos de identidad, retención o privacidad?
- Si una decisión debe cambiar, ¿actualicé `docs/00-producto.md` y `openspec/config.yaml`?

Si alguna respuesta es “sí” y no hay test, el cambio no está terminado.

---

## 11. SOLID y convenciones de código

### SOLID

- **Responsabilidad única:** una ruta no calcula reglas de negocio; un servicio no renderiza HTML; un repositorio no envía correos.
- **Abierto/cerrado:** los proveedores de OTP, correo y almacenamiento se extienden mediante nuevas implementaciones, no modificando el servicio que los usa.
- **Sustitución de Liskov:** evita jerarquías de clases innecesarias; usa interfaces y composición.
- **Segregación de interfaces:** define puertos pequeños y específicos, por ejemplo `OtpSender`, `EmailSender`, `DocumentStorage`.
- **Inversión de dependencias:** los servicios dependen de interfaces, no de SDKs concretos.

### Convenciones

- TypeScript estricto, sin `any` innecesario.
- Zod en todos los límites: body, query, params y respuestas.
- Prisma solo dentro de repositorios.
- Nombres de modelos en PascalCase; campos en camelCase; tablas y columnas en snake_case con `@@map` y `@map`.
- JSON de API en camelCase.
- Fechas en UTC o `date`; visualización en `America/Santiago`.
- RUT normalizado y validado con dígito verificador.
- Teléfonos en E.164.
- Correos en minúsculas.
- IDs UUID.
- Errores de API con código estable y mensaje en español de Chile.
- No usar `console.log`; usar el logger de Fastify/Pino.
- No dejar código muerto ni comentarios obsoletos.

---

## 12. Seguridad como restricción de diseño

La implementación completa de la capa de seguridad está fuera del alcance de esta tarea, pero las siguientes restricciones no se deben contradecir:

- OTP de un solo uso, con expiración y rate limit.
- Token de sesión persistido y cookie `httpOnly`.
- Cifrado de documentos de identidad.
- Acceso a documentos solo mediante endpoint autorizado.
- Validación de permisos en el servidor.
- Sin datos personales en logs.
- Sin secretos en el repositorio.
- Sin URLs públicas de documentos.
- Retención de documentos de 12 meses.
- Auditoría de firmas, aprobaciones, rechazos y anulaciones.

No implementes la capa de seguridad completa salvo que el change lo pida explícitamente. Si una tarea la requiere, primero actualiza el alcance en `docs/00-producto.md`.

---

## 13. Definition of Done

Un cambio está terminado cuando:

- Los tests se ejecutaron al inicio y al final.
- `pnpm test` pasa.
- `pnpm typecheck` pasa.
- `pnpm build` pasa.
- Las reglas de negocio afectadas tienen tests.
- No se rompió ninguna decisión de `docs/00-producto.md`.
- La documentación quedó actualizada si cambió una decisión.
- No hay secretos ni datos personales en logs.
- El cambio es pequeño y revisable.
- El texto visible está en español de Chile, con tildes.

---

## 14. Qué no hacer

- No implementar funcionalidades fuera de `docs/00-producto.md`.
- No agregar multi-colegio, OCR, firma avanzada, notificaciones masivas ni integración con SIGE.
- No bloquear fechas en el calendario de retiros.
- No cambiar el stack sin justificación y actualización documental.
- No crear un monorepo.
- No implementar la capa de seguridad completa sin una spec que lo autorice.
- No confiar en permisos calculados en el cliente.
- No exponer documentos de identidad en URLs públicas.
- No registrar datos personales en logs.
- No eliminar autorizaciones ni registros de auditoría.
- No escribir documentación o UI sin tildes.
- No cerrar un spec con tests rojos.

---

## 15. Comandos previstos

Se habilitarán cuando exista el scaffold:

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm test:watch
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm format
pnpm db:migrate
pnpm db:seed
pnpm db:studio
docker compose up -d
```

Scripts esperados en `package.json`:

| Script | Propósito |
|---|---|
| `dev` | Fastify + Vite en desarrollo |
| `build` | Build del cliente y del servidor |
| `start` | Ejecutar la versión de producción |
| `test` | Tests unitarios y de integración |
| `test:e2e` | Tests end-to-end con Playwright |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint |
| `format` | Prettier |
| `db:migrate` | Migraciones de Prisma |
| `db:seed` | Datos de ejemplo |
| `db:studio` | Prisma Studio |

---

## 16. Variables de entorno previstas

```dotenv
NODE_ENV=development
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://usuario:clave@localhost:5432/colegio
SESSION_SECRET=cambiar-en-produccion
ENCRYPTION_KEY=cambiar-en-produccion
RESEND_API_KEY=
EMAIL_FROM=no-reply@colegio.cl
WHATSAPP_PROVIDER=mock
WHATSAPP_API_URL=
WHATSAPP_API_TOKEN=
WHATSAPP_SENDER_ID=
UPLOAD_DIR=./data/uploads
TZ=America/Santiago
LOG_LEVEL=info
RETENTION_DAYS=365
OTP_TTL_MINUTES=10
```

Nunca commitear valores reales de secretos.

---

## 17. Glosario rápido

| Término | Identificador |
|---|---|
| Apoderado | `Guardian` / `User` |
| Estudiante | `Student` |
| Curso | `Course` |
| Evento | `Event` |
| Autorización | `Authorization` |
| Retiro externo | `PickupRequest` / `PickupItem` |
| Externo | `ExternalPerson` |
| Documento de identidad | `Document` / `IdentityDocument` |
| Código de verificación | `LoginCode` / OTP |
| Sesión | `Session` |
| Resumen obligatorio | `AuthorizationSummary` / `PickupSummary` |
| Evidencia | `AuthorizationEvidence` |
| Firma electrónica simple | Simple electronic signature with evidence |
