# Spec Delta

## Purpose

Permite que un apoderado autorice a uno, varios o todos sus estudiantes en uno, varios o todos los eventos aplicables mediante un solo envío, con un resumen obligatorio y un único documento de identidad.

## ADDED Requirements

### Requirement: Listado de eventos autorizables

Al entrar a **Firmar Autorización**, el sistema SHALL mostrar solo los eventos en estado publicado cuya fecha de término no haya pasado, cuya fecha límite de firma no haya vencido y que apliquen a al menos un estudiante vinculado al apoderado, ordenados por fecha límite ascendente. Los eventos que aún no han ocurrido y que ya tienen autorizados a todos los estudiantes aplicables SHALL permanecer visibles y marcarse como **Estudiantes Autorizados**.

#### Scenario: Eventos aplicables visibles

- **GIVEN** un apoderado con dos estudiantes vinculados y tres eventos publicados vigentes
- **WHEN** entra a **Firmar Autorización**
- **THEN** ve los eventos que aplican a al menos uno de sus estudiantes
- **AND** cada evento muestra su nombre, fecha y fecha límite

#### Scenario: Eventos no publicados ocultos

- **GIVEN** eventos en estado borrador, cerrado o cancelado que aplican a un estudiante del apoderado
- **WHEN** el apoderado entra a **Firmar Autorización**
- **THEN** esos eventos no aparecen en el listado

#### Scenario: Evento con fecha límite vencida

- **GIVEN** un evento publicado cuya fecha límite de firma ya pasó
- **WHEN** el apoderado entra a **Firmar Autorización**
- **THEN** el evento no aparece en el listado

#### Scenario: Evento ya ocurrido

- **GIVEN** un evento publicado cuya fecha de término ya pasó
- **WHEN** el apoderado entra a **Firmar Autorización**
- **THEN** el evento no aparece en el listado

#### Scenario: Evento sin estudiantes del apoderado

- **GIVEN** un evento publicado vigente que no aplica a ningún estudiante del apoderado
- **WHEN** el apoderado entra a **Firmar Autorización**
- **THEN** el evento no aparece en el listado

#### Scenario: Sin eventos aplicables

- **GIVEN** un apoderado sin eventos publicados vigentes que apliquen a sus estudiantes
- **WHEN** entra a **Firmar Autorización**
- **THEN** ve un mensaje que indica que no tiene eventos por autorizar
- **AND** no ve un error de sistema

### Requirement: Estudiantes aplicables por evento

Al abrir un evento, el sistema SHALL listar solo los estudiantes vinculados al apoderado que aplican al evento según cursos, inclusiones y exclusiones, y SHALL indicar cuáles ya tienen una autorización vigente.

#### Scenario: Solo estudiantes vinculados al apoderado

- **GIVEN** un evento que aplica a un curso con estudiantes de varios apoderados
- **WHEN** el apoderado abre el evento
- **THEN** ve solo los estudiantes de ese curso que están vinculados a su cuenta

#### Scenario: Exclusión individual

- **GIVEN** un estudiante del apoderado que pertenece a un curso del evento pero tiene una exclusión individual
- **WHEN** el apoderado abre el evento
- **THEN** el estudiante no aparece en el listado

#### Scenario: Inclusión individual

- **GIVEN** un estudiante del apoderado que no pertenece a los cursos del evento pero tiene una inclusión individual
- **WHEN** el apoderado abre el evento
- **THEN** el estudiante aparece en el listado

#### Scenario: Estudiante ya autorizado

- **GIVEN** un estudiante con una autorización vigente para el evento
- **WHEN** el apoderado abre el evento
- **THEN** el estudiante aparece marcado como **Ya autorizada**
- **AND** no se puede seleccionar
- **AND** no se muestra qué apoderado firmó

#### Scenario: Evento con todos los estudiantes autorizados

- **GIVEN** un evento publicado que aún no ha ocurrido y cuya fecha límite no ha vencido
- **AND** todos los estudiantes del apoderado aplicables al evento ya tienen autorización vigente
- **WHEN** el apoderado entra a **Firmar Autorización**
- **THEN** el evento aparece en el listado marcado como **Estudiantes Autorizados**
- **AND** al abrirlo, todos los estudiantes aparecen como **Ya autorizada**
- **AND** no hay estudiantes seleccionables

#### Scenario: Evento sin estudiantes pendientes

- **GIVEN** un evento en que todos los estudiantes del apoderado ya tienen autorización vigente
- **WHEN** el apoderado abre el evento
- **THEN** ve un mensaje que indica que no quedan estudiantes por autorizar
- **AND** la acción de seleccionar todos está deshabilitada

### Requirement: Flujo mínimo de un evento y un estudiante

El sistema SHALL permitir que un apoderado autorice a un solo estudiante en un solo evento de principio a fin: seleccionar el evento, seleccionar al estudiante, revisar el resumen, capturar su documento y confirmar.

#### Scenario: Un solo evento y un solo estudiante

- **GIVEN** un apoderado con un estudiante aplicable a un evento publicado vigente
- **WHEN** selecciona el evento, selecciona al estudiante, revisa el resumen, captura su documento y confirma
- **THEN** se crea una autorización para ese par
- **AND** el apoderado ve un mensaje que indica que su autorización fue enviada con éxito

#### Scenario: Sin documento no se puede confirmar

- **GIVEN** un resumen con un par estudiante–evento
- **WHEN** el apoderado intenta confirmar sin capturar su documento
- **THEN** el sistema no crea la autorización
- **AND** le pide capturar el documento

#### Scenario: El flujo mínimo registra la misma evidencia

- **GIVEN** un apoderado con un solo estudiante y un solo evento
- **WHEN** completa la firma
- **THEN** la autorización registra la misma evidencia que un envío con varios pares
- **AND** el resultado informa el éxito de la autorización

### Requirement: Selección de estudiantes dentro de un evento

El apoderado SHALL poder seleccionar uno o varios estudiantes aplicables y pendientes de un evento, y cada estudiante seleccionado SHALL representar exactamente una autorización para ese evento.

#### Scenario: Seleccionar un estudiante

- **GIVEN** un evento con dos estudiantes pendientes del apoderado
- **WHEN** selecciona uno y continúa
- **THEN** la selección contiene un par estudiante–evento

#### Scenario: Seleccionar varios estudiantes

- **GIVEN** un evento con tres estudiantes pendientes del apoderado
- **WHEN** selecciona dos y continúa
- **THEN** la selección contiene dos pares estudiante–evento del mismo evento

#### Scenario: Desmarcar un estudiante

- **GIVEN** un estudiante seleccionado en un evento
- **WHEN** el apoderado lo desmarca
- **THEN** el par deja de formar parte de la selección
- **AND** el contador total disminuye en uno

### Requirement: Seleccionar todos los estudiantes de un evento

El botón **Seleccionar todos** SHALL seleccionar únicamente los estudiantes del apoderado aplicables al evento que no tengan autorización vigente, y SHALL permitir desmarcarlos individualmente después.

#### Scenario: Selecciona solo aplicables del apoderado

- **GIVEN** un evento con estudiantes de varios apoderados y dos estudiantes aplicables del apoderado
- **WHEN** el apoderado usa **Seleccionar todos**
- **THEN** se seleccionan solo sus dos estudiantes aplicables
- **AND** no se selecciona ningún estudiante de otro apoderado

#### Scenario: Excluye estudiantes ya autorizados

- **GIVEN** un evento con tres estudiantes aplicables del apoderado, uno de ellos ya autorizado
- **WHEN** el apoderado usa **Seleccionar todos**
- **THEN** se seleccionan solo los dos estudiantes pendientes

#### Scenario: Desmarcar después de seleccionar todos

- **GIVEN** una selección creada con **Seleccionar todos**
- **WHEN** el apoderado desmarca uno de los estudiantes
- **THEN** ese par sale de la selección
- **AND** los demás pares se mantienen seleccionados

### Requirement: Seleccionar todos los eventos

El botón **Seleccionar todos los eventos** SHALL seleccionar todos los pares estudiante–evento en que el estudiante esté vinculado al apoderado, aplique al evento publicado y vigente, y no tenga autorización vigente.

#### Scenario: Todos los pares aplicables

- **GIVEN** un apoderado con dos estudiantes y tres eventos publicados vigentes, donde cada evento aplica a ambos estudiantes
- **WHEN** usa **Seleccionar todos los eventos**
- **THEN** la selección contiene seis pares estudiante–evento
- **AND** el contador total muestra seis autorizaciones

#### Scenario: Aplicabilidad parcial

- **GIVEN** un apoderado con dos estudiantes, donde uno aplica a un evento y el otro no
- **WHEN** usa **Seleccionar todos los eventos**
- **THEN** ese evento aporta un solo par, correspondiente al estudiante aplicable

#### Scenario: Excluye pares ya autorizados

- **GIVEN** un apoderado con dos estudiantes y dos eventos, donde un estudiante ya tiene autorización vigente en un evento
- **WHEN** usa **Seleccionar todos los eventos**
- **THEN** la selección contiene los tres pares pendientes
- **AND** el par ya autorizado no se selecciona

#### Scenario: No incluye eventos sin pendientes

- **GIVEN** un evento cuyos estudiantes del apoderado ya están todos autorizados
- **WHEN** usa **Seleccionar todos los eventos**
- **THEN** ese evento no aporta pares a la selección

#### Scenario: Desmarcar un par después de seleccionar todos

- **GIVEN** una selección creada con **Seleccionar todos los eventos**
- **WHEN** el apoderado desmarca un par estudiante–evento
- **THEN** ese par sale de la selección
- **AND** los demás pares se mantienen

### Requirement: Selección combinada y contador

El apoderado SHALL poder combinar selecciones de distintos eventos y estudiantes en un mismo envío, sin pares duplicados, y SHALL ver en todo momento la cantidad total de autorizaciones seleccionadas.

#### Scenario: Combinar eventos y estudiantes

- **GIVEN** dos eventos con estudiantes pendientes
- **WHEN** el apoderado selecciona un estudiante del primer evento y dos del segundo
- **THEN** la selección contiene tres pares de ambos eventos

#### Scenario: Un estudiante en varios eventos

- **GIVEN** un apoderado con un estudiante que aplica a tres eventos publicados vigentes
- **WHEN** el apoderado selecciona al estudiante en los tres eventos
- **THEN** la selección contiene tres pares del mismo estudiante
- **AND** el contador muestra tres autorizaciones

#### Scenario: Sin pares duplicados

- **GIVEN** un par estudiante–evento ya seleccionado
- **WHEN** el apoderado vuelve a seleccionar el mismo estudiante en el mismo evento
- **THEN** el par sigue apareciendo una sola vez en la selección

#### Scenario: Contador siempre visible

- **GIVEN** una selección con cuatro pares
- **WHEN** el apoderado navega entre eventos
- **THEN** el contador muestra cuatro autorizaciones seleccionadas en todo momento

#### Scenario: Selección vacía

- **GIVEN** una selección sin pares
- **WHEN** el apoderado intenta continuar al resumen
- **THEN** el sistema no lo permite
- **AND** muestra un mensaje que indica que debe seleccionar al menos una autorización

### Requirement: Resumen obligatorio

Antes de solicitar el documento, el sistema SHALL mostrar un resumen obligatorio y único con todos los pares seleccionados, indicando evento, fecha y hora, estudiante, propósito y fecha límite, y SHALL permitir volver a la selección sin perderla.

#### Scenario: Resumen con todos los pares

- **GIVEN** una selección de tres pares correspondientes a dos eventos y dos estudiantes
- **WHEN** el apoderado continúa al resumen
- **THEN** el resumen muestra los tres pares
- **AND** cada par indica evento, fecha y hora, estudiante, propósito y fecha límite

#### Scenario: Volver a la selección

- **GIVEN** el resumen con una selección de tres pares
- **WHEN** el apoderado vuelve a la selección
- **THEN** los tres pares siguen seleccionados

#### Scenario: No se puede omitir el resumen

- **GIVEN** una selección con al menos un par
- **WHEN** el apoderado intenta confirmar sin pasar por el resumen
- **THEN** el sistema no crea autorizaciones
- **AND** lo devuelve al resumen obligatorio

#### Scenario: Resumen actualizado tras cambiar la selección

- **GIVEN** un resumen mostrado con dos pares
- **WHEN** el apoderado vuelve, agrega un tercer par y regresa al resumen
- **THEN** el resumen muestra los tres pares actuales

### Requirement: Un documento de identidad por envío

El sistema SHALL solicitar una sola captura del documento de identidad del apoderado por envío y SHALL usarla como respaldo de todas las autorizaciones creadas en ese envío.

#### Scenario: Un documento para varios pares

- **GIVEN** un envío con seis pares de tres eventos y dos estudiantes
- **WHEN** el apoderado captura su documento de identidad una vez y confirma
- **THEN** las autorizaciones creadas quedan respaldadas por ese mismo documento
- **AND** el sistema no vuelve a pedir el documento para los pares restantes

#### Scenario: Error al capturar el documento

- **GIVEN** un envío con pares seleccionados
- **WHEN** la captura o carga del documento falla
- **THEN** no se crea ninguna autorización
- **AND** el apoderado puede reintentar la captura sin perder la selección

#### Scenario: Documento sin acceso público

- **GIVEN** un documento de identidad cargado en un envío
- **WHEN** cualquier usuario intenta acceder a él por una URL pública
- **THEN** el acceso es rechazado
- **AND** solo se puede obtener mediante el endpoint autorizado

### Requirement: Confirmación y evidencia

Al confirmar, el sistema SHALL crear una autorización en estado firmada por cada par válido, con evidencia individual: fecha y hora, IP, user agent, sesión, documento de identidad, snapshot del texto de autorización y snapshot del resumen.

#### Scenario: Un par genera una autorización

- **GIVEN** una selección con un solo par estudiante–evento
- **WHEN** el apoderado confirma con su documento
- **THEN** se crea una autorización para ese par
- **AND** queda en estado firmada

#### Scenario: Varios pares generan varias autorizaciones

- **GIVEN** una selección con cinco pares de dos eventos
- **WHEN** el apoderado confirma con su documento
- **THEN** se crean cinco autorizaciones, una por par
- **AND** cada una queda asociada a su evento y su estudiante

#### Scenario: Evidencia individual

- **GIVEN** un envío con tres pares
- **WHEN** se crean las autorizaciones
- **THEN** cada autorización registra su propia fecha y hora, IP, user agent, sesión, documento y snapshots
- **AND** la evidencia de una autorización no depende de las demás

#### Scenario: Mensaje de éxito

- **GIVEN** un envío con al menos un par válido
- **WHEN** se crean las autorizaciones
- **THEN** el apoderado ve un mensaje que indica que su autorización fue enviada con éxito
- **AND** si se creó más de una autorización, el mensaje lo indica en plural

#### Scenario: Sin duplicados

- **GIVEN** un estudiante con autorización vigente para un evento
- **WHEN** el apoderado confirma un envío que incluye ese par
- **THEN** el sistema no crea una segunda autorización vigente para ese par
- **AND** lo informa en el resultado

### Requirement: Resultado parcial del envío

Si al confirmar un par deja de ser válido, el sistema SHALL crear las autorizaciones de los pares válidos y SHALL informar cada par autorizado y cada par no autorizado con su motivo, sin crear evidencia para los no autorizados.

#### Scenario: Fecha límite vencida durante el envío

- **GIVEN** un envío con tres pares, donde uno corresponde a un evento cuya fecha límite vence antes de la confirmación
- **WHEN** el apoderado confirma
- **THEN** se crean las autorizaciones de los dos pares válidos
- **AND** el resultado indica que el tercer par no se autorizó porque la fecha límite venció
- **AND** no se registra evidencia para el par no autorizado

#### Scenario: Evento cerrado o cancelado durante el envío

- **GIVEN** un envío con dos pares, donde el evento de uno pasa a cerrado o cancelado antes de la confirmación
- **WHEN** el apoderado confirma
- **THEN** se crea la autorización del par válido
- **AND** el resultado indica que el otro par no se autorizó por el estado del evento

#### Scenario: Otro apoderado firmó primero

- **GIVEN** un envío con dos pares, donde otro apoderado del mismo estudiante firma uno de los pares antes de la confirmación
- **WHEN** el apoderado confirma
- **THEN** se crea solo la autorización del par pendiente
- **AND** el resultado indica que el otro par ya estaba autorizado

#### Scenario: Todos los pares válidos

- **GIVEN** un envío cuyos pares siguen siendo válidos al confirmar
- **WHEN** el apoderado confirma
- **THEN** se crean todas las autorizaciones
- **AND** el resultado informa el éxito de cada par

#### Scenario: Ningún par válido

- **GIVEN** un envío cuyos pares dejaron de ser válidos antes de la confirmación
- **WHEN** el apoderado confirma
- **THEN** no se crea ninguna autorización
- **AND** el resultado informa el motivo de cada par no autorizado

### Requirement: Validación de permisos y aplicabilidad en el servidor

El servidor SHALL validar cada par contra el vínculo del apoderado, la aplicabilidad al evento y la vigencia del evento, sin confiar en los identificadores ni en los cálculos del cliente.

#### Scenario: Estudiante de otro apoderado

- **GIVEN** un apoderado autenticado y el identificador de un estudiante que no le pertenece
- **WHEN** intenta confirmar una autorización para ese estudiante
- **THEN** el servidor rechaza el par
- **AND** no crea ninguna autorización para ese estudiante

#### Scenario: Estudiante no aplicable al evento

- **GIVEN** un estudiante del apoderado excluido del evento
- **WHEN** el apoderado intenta confirmar una autorización para ese par
- **THEN** el servidor rechaza el par
- **AND** informa que el estudiante no aplica al evento

#### Scenario: Evento no publicado o vencido

- **GIVEN** un evento en borrador, cerrado, cancelado o con fecha límite vencida
- **WHEN** el apoderado intenta confirmar una autorización para ese evento
- **THEN** el servidor rechaza el par
- **AND** informa que el evento no permite firmar

#### Scenario: Error con código estable

- **GIVEN** una solicitud rechazada por permisos o aplicabilidad
- **WHEN** el servidor responde
- **THEN** usa un código de error estable
- **AND** el mensaje está en español de Chile

### Requirement: Fechas y zona horaria

El sistema SHALL almacenar las fechas en UTC o como fecha sin hora y SHALL mostrar la fecha y hora del evento y la fecha límite en la zona America/Santiago.

#### Scenario: Evento nocturno

- **GIVEN** un evento que comienza a las 23:30 hora de Chile
- **WHEN** el apoderado ve la fecha en el resumen
- **THEN** la fecha mostrada corresponde al día local del evento
- **AND** no se muestra el día siguiente por conversión de zona

#### Scenario: Comparación de la fecha límite

- **GIVEN** un evento cuya fecha límite es hoy a las 18:00 hora de Chile
- **WHEN** el apoderado confirma a las 18:01
- **THEN** el servidor rechaza el par por fecha límite vencida
- **AND** usa la hora del servidor, no la del dispositivo

### Requirement: Privacidad del flujo de firma

El sistema SHALL mostrar la marca **Ya autorizada** sin revelar qué apoderado firmó y SHALL excluir nombres, documentos y datos personales de los logs.

#### Scenario: Autorización firmada por otro apoderado

- **GIVEN** un estudiante con dos apoderados, donde uno ya firmó el evento
- **WHEN** el otro apoderado abre el evento
- **THEN** ve el estudiante como **Ya autorizada**
- **AND** no ve el nombre del apoderado firmante

#### Scenario: Logs sin datos personales

- **GIVEN** un envío de autorizaciones con nombres y documentos de identidad
- **WHEN** el sistema registra el evento en los logs
- **THEN** no incluye nombres, documentos ni datos personales
- **AND** registra solo identificadores internos y el resultado de la operación
