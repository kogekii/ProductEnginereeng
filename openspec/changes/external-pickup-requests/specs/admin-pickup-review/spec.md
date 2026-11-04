# Spec Delta

## Purpose

Permitir a dirección revisar solicitudes de retiro con sus documentos, resolver cada lote completo y consultar quién puede retirar a cada estudiante en una fecha determinada.

## ADDED Requirements

### Requirement: Acceso exclusivo de administración
El servidor MUST validar el rol de administrador para listar retiros del colegio, ver sus detalles y resolverlos. La navegación administrativa SHALL ofrecer **Retiros** junto a **Eventos**, conservando el acceso a cerrar sesión.

#### Scenario: Administrador y apoderado acceden al módulo
- **GIVEN** usuarios con y sin rol administrador
- **WHEN** intentan abrir o invocar las operaciones administrativas de retiros
- **THEN** el administrador tiene acceso, el apoderado recibe `403` y quien no tiene sesión recibe `401`
- **AND** ocultar botones en el cliente no reemplaza esa validación.

### Requirement: Listado por fecha y estado
El sistema SHALL listar solicitudes con filtros combinables de fecha de retiro y estado. SHALL identificar estudiante, curso, apoderado, fecha, externo y estado. Al filtrar por fecha SHALL mostrar los pares de ese día sin ocultar que la solicitud abarca otras fechas.

#### Scenario: Consulta del día y solicitudes pendientes
- **GIVEN** solicitudes pendientes, aprobadas y rechazadas en varias fechas
- **WHEN** el administrador filtra por una fecha y `PENDING_REVIEW`
- **THEN** solo ve solicitudes pendientes que contienen esa fecha y sus estudiantes para ese día
- **AND** puede abrir el lote completo; una lista vacía se explica como tal.

### Requirement: Detalle y revisión de ambos documentos
El detalle SHALL mostrar todas las fechas y estudiantes del lote, el apoderado, la identidad del externo y acceso privado separado a ambos documentos. MUST permitir distinguir cuál corresponde a cada persona y advertir que aprobar o rechazar afecta al lote completo.

#### Scenario: Revisión de solicitud multi-día
- **GIVEN** una solicitud con estudiantes distintos según la fecha
- **WHEN** el administrador abre el detalle desde un listado filtrado
- **THEN** ve todas las fechas, sus estudiantes y el externo único
- **AND** puede abrir ambos documentos mediante endpoints autorizados sin URLs públicas; si alguno no está disponible, se indica y la aprobación se bloquea.

### Requirement: Aprobación completa de solicitud pendiente
El sistema MUST permitir aprobar solo solicitudes `PENDING_REVIEW`, con ambos documentos disponibles y sin fechas pasadas en Santiago. SHALL permitir aprobación el mismo día del retiro y aprobar todos los pares del lote, sin exigir motivo ni permitir aprobación parcial. La aprobación MUST conservar la exclusividad estudiante–fecha.

#### Scenario: Aprobación válida
- **GIVEN** una solicitud pendiente con documentos disponibles y fechas de hoy o futuras
- **WHEN** el administrador confirma aprobar el lote completo
- **THEN** pasa a `APPROVED`, registra quién y cuándo revisó y todos sus pares quedan autorizados para sus respectivas fechas
- **AND** el apoderado ve el nuevo estado al consultar de nuevo.

#### Scenario: Lote pendiente con una fecha vencida
- **GIVEN** un lote pendiente con una fecha pasada, aunque otras sean de hoy o futuras
- **WHEN** intenta aprobarlo
- **THEN** se rechaza la operación y el lote sigue pendiente
- **AND** puede rechazarlo con motivo; no se aprueban solo los días futuros.

### Requirement: Rechazo motivado y liberación de pares
El sistema MUST permitir rechazar solicitudes pendientes con motivo no vacío. SHALL rechazar el lote completo y liberar sus pares para nuevas solicitudes; MUST conservar el historial y comunicar el motivo al apoderado dentro de la aplicación.

#### Scenario: Motivo obligatorio
- **GIVEN** una solicitud pendiente
- **WHEN** intenta rechazarla con motivo vacío o solo espacios
- **THEN** recibe un error y la solicitud permanece pendiente
- **AND** con un motivo válido pasa a `REJECTED` y deja de bloquear nuevas solicitudes para esos pares.

### Requirement: Decisión única y auditada
La revisión MUST cambiar estado y registrar auditoría de forma atómica. Dos decisiones simultáneas SHALL producir una sola transición; resolver una solicitud que dejó de estar pendiente MUST informar conflicto y mostrar el estado actual sin sobrescribirlo.

#### Scenario: Dos revisores o doble clic
- **GIVEN** dos revisiones simultáneas de la misma solicitud pendiente
- **WHEN** una aprueba y otra rechaza, o ambas repiten la misma acción
- **THEN** solo se registra una decisión y una auditoría de transición
- **AND** la otra operación recibe un conflicto recuperable sin alterar al revisor ni al motivo ya registrados.

### Requirement: Validez limitada al estudiante y fecha aprobados
El sistema MUST identificar como autorizados únicamente los pares de una solicitud aprobada para la fecha consultada. Pendiente o rechazada no SHALL mostrarse como permiso para retirar, y una aprobación no SHALL extenderse a estudiantes o días ausentes del lote.

#### Scenario: Consulta operativa de autorizados
- **GIVEN** un externo aprobado para un estudiante el lunes, otro estudiante solo el martes y un tercer retiro pendiente
- **WHEN** dirección consulta aprobados para el lunes
- **THEN** identifica solo el primer par como autorizado con ese externo
- **AND** no incluye el par del martes ni el pendiente como autorizaciones del lunes.
