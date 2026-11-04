# Tasks

## 1. Línea base y entorno verificable

- [x] 1.1 Leer producto y artefactos, ejecutar `pnpm test`, `pnpm typecheck` y `pnpm build` (usar `corepack pnpm` si corresponde), y registrar resultados reales; verificar la línea base y resolver el entorno PostgreSQL de pruebas, migraciones y seed antes de implementar, sin ocultar los fallos de integración detectados en planificación.

## 2. Dominio compartido y migración aditiva

- [x] 2.1 Crear schemas de entrada/respuesta en `src/shared/pickup.ts` y helpers de identidad; verificar con tests de RUT normalizado/dígito, pasaporte, un externo, campos obligatorios, días/estudiantes repetidos y selección vacía.
- [x] 2.2 Extender helpers de fecha civil y ventana Santiago con reloj inyectable; verificar hoy/pasado, fines de semana, feriado sin tratamiento, último día de mes, febrero, diciembre/enero, cambio de hora y dispositivo en otra zona.
- [x] 2.3 Implementar estado puro de selección por fecha, ajuste común y personalización; verificar todos por defecto, estudiantes inactivos excluidos, excepción preservada, restauración común, fecha nueva/reagregada con todos, día vacío y eliminación independiente de una fecha.
- [x] 2.4 Agregar modelos de solicitud, externo único, detalle y reserva activa, relaciones de usuario/sesión/documentos y precedencia opcional de documentos; verificar migración sobre base con autorizaciones existentes sin pérdida de datos.
- [x] 2.5 Crear índices, FKs y unicidad de reservas estudiante–fecha y apoderado/clave; verificar con integración PostgreSQL rechazo de duplicados e imposibilidad de una reserva que no corresponda al estudiante y fecha de su detalle.

## 3. Documentos compatibles y ordenados

- [x] 3.1 Extraer acceso Prisma de documentos a un puerto/repositorio acotado y admitir tipo externo con `guardianDocumentId` previo; verificar uploads existentes sin query y nuevo flujo con permisos, precedencia, tipos, tamaño y firma de archivo.
- [x] 3.2 Adaptar lectura privada para documentos de retiros, vencidos, eliminados o ausentes; verificar dueño, otro apoderado, administrador, ausencia de sesión y cabeceras de descarga sin caché, manteniendo hash/metadatos.
- [x] 3.3 Implementar reclamación de documentos bajo bloqueo estable en retiros y adaptar la asociación de documentos de autorizaciones al mismo mecanismo; verificar carreras entre dos retiros y entre retiro/autorización, rechazo de IDs repetidos o usados y regresión de envíos parciales/demo de autorizaciones.
- [x] 3.4 Documentar carga y límites reales en la guía existente o una sección específica de retiros, sin declarar cifrado ni borrado físico implementados; verificar que no aparecen rutas públicas, datos personales en logs ni una omisión automática de documentos en el retiro demo.

## 4. API del apoderado y envío íntegro

- [x] 4.1 Implementar servicio/repositorio de contexto y registrar rutas del apoderado en `src/server/app.ts`; verificar contexto calculado por servidor, solo estudiantes propios activos, usuario sin estudiantes y respuestas validadas.
- [x] 4.2 Implementar transacción de creación con revalidación de fechas/vínculos/documentos, un externo, detalles, reservas, snapshot y auditoría; verificar lote válido y rollback total ante un solo par inválido, documento inválido o conflicto preexistente.
- [x] 4.3 Incorporar hash canónico e idempotencia por apoderado/clave, reintentos acotados de transacciones y errores recuperables; verificar doble envío concurrente, respuesta perdida, mismo contenido reordenado, clave con contenido distinto, reintento tras cambio de día y conflictos entre apoderados del mismo estudiante.
- [x] 4.4 Exponer listado paginado y detalle de solicitudes propias con estados y motivo; verificar aislamiento por apoderado, paginación estable, IDs ajenos sin filtraciones y evidencia conservada.
- [x] 4.5 Documentar contratos, códigos de error e invariantes en la guía de retiros; contrastar ejemplos con tests HTTP de endpoints del apoderado, sin incluir datos reales ni secretos.

## 5. API de revisión de dirección

- [x] 5.1 Implementar listado administrativo por fecha/estado y detalle completo; verificar filtros combinados, cursos/estudiantes correctos, paginación sin solicitudes duplicadas y `401`/`403` según sesión/rol.
- [x] 5.2 Implementar aprobación atómica de pendientes con documentos disponibles, sin fechas pasadas y conservando reservas; verificar todos los pares aprobados, aprobación el día del retiro, bloqueo por fecha pasada o documento ausente y auditoría con revisor/hora.
- [x] 5.3 Implementar rechazo del lote con motivo y liberación de reservas; verificar motivo vacío/espacios, límite de motivo, conservación del historial y nueva solicitud corregida con documentos nuevos para un par rechazado.
- [x] 5.4 Proteger transición pendiente con actualización condicional y auditoría transaccional; verificar dos revisores concurrentes, doble clic y resolución repetida, con una sola decisión/auditoría y conflicto que devuelve el estado actual.
- [x] 5.5 Documentar revisión completa y distinción entre pendiente/aprobada/rechazada; validar con consulta de autorizados por fecha que nunca incorpora otro día, estudiante ni solicitud pendiente.

## 6. Flujo móvil del apoderado

- [x] 6.1 Habilitar **Retiro Externo** y provider/rutas del trámite; verificar apertura directa del calendario, guardas, estado vacío y limpieza de borrador/caché al cerrar sesión, sin alterar navegación de autorizaciones.
- [x] 6.2 Construir calendario de dos meses con controles superiores, estado seleccionado y nombres predeterminados; verificar selección entre meses, días inhabilitados, cambio de año, foco/etiquetas y 320 px sin desplazamiento horizontal.
- [x] 6.3 Integrar selección común y opción secundaria por día usando el dominio compartido; verificar excepción preservada, día nuevo con todos, diferencias visibles, último estudiante desmarcado y nombres correctos en cada fecha.
- [x] 6.4 Construir datos del externo y cargas ordenadas con cámara opcional y selector de archivo; verificar error en segunda carga sin perder la primera, cambio del documento del apoderado invalida el externo, reintento independiente y validación por campo.
- [x] 6.5 Construir resumen y confirmación idempotente con errores recuperables; verificar volver/editar sin pérdida, actualización exacta del resumen, doble clic, conflicto por par, fecha que vence durante el trámite y redirección explicada si se recarga sin borrador.
- [x] 6.6 Construir listado/detalle propio y confirmación de recepción pendiente; verificar estados actualizados al volver o refrescar, motivo de rechazo y distinción textual entre recibido y autorizado.
- [x] 6.7 Actualizar guía del apoderado con camino rápido y ajuste por fecha; verificar con recorrido de navegador automatizado que el caso sin excepciones no exige tocar casillas ni repetir campos o documentos por día, y que usa marca y español de Chile.

## 7. Interfaz de dirección y circuito demostrable

- [x] 7.1 Agregar **Retiros** a la navegación administrativa y construir filtros/listado/detalle conservando **Cerrar sesión**; verificar componente con datos sintéticos y acceso directo protegido por rol.
- [x] 7.2 Integrar descarga privada de ambos documentos y acciones explícitas sobre lote completo; verificar aprobación, rechazo con motivo, carga/error, documento no disponible, solicitud ya resuelta y refresco después de conflicto.
- [x] 7.3 Añadir fixtures sintéticos y E2E de apoderado multi-día/mes, ajuste por fecha, dos archivos, envío, revisión/aprobación y consulta del estado; verificar con PostgreSQL y Playwright el circuito completo y que solo aparecen pares del día aprobado.
- [x] 7.4 Añadir E2E de rechazo con motivo, corrección en una nueva solicitud y no duplicación por reintento; verificar conservación del historial y liberación de pares rechazados.
- [ ] 7.5 Completar un recorrido manual con apoderados en el navegador interno de WhatsApp para validar el caso simple y uno personalizado; registrar tiempos, errores y abandono sin inventar mediciones. El guion ya está documentado y Playwright comprueba 320 px, pero falta esta validación de campo.

## 8. Verificación integral

- [x] 8.1 Ejecutar `pnpm test`, `pnpm typecheck`, `pnpm build` y los E2E de retiros y regresión de autorizaciones/documentos, con base PostgreSQL preparada; adjuntar resultados y no cerrar el change con fallos u omisiones de casos críticos.
- [x] 8.2 Revisar reglas 2–4, 14–25 y 27 y decisiones de producto contra los escenarios, confirmar documentos privados/logs sin datos personales y alcance de seguridad documentado; verificar coherencia entre producto, AGENTS, config y artefactos con `openspec validate external-pickup-requests --strict`.
