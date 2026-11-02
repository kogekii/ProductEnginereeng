# Spec Delta

## Purpose

Da al administrador una vista por evento de los eventos del mes actual y el siguiente, con la cantidad de autorizaciones faltantes y el listado de estudiantes y apoderados que aún no han autorizado.

## ADDED Requirements

### Requirement: Menú Eventos del administrador

El dashboard SHALL ofrecer un menú **Eventos** con los eventos en estado publicado o cerrado que aún no han ocurrido, cuya fecha de inicio esté dentro del mes calendario actual o el mes siguiente según America/Santiago.

#### Scenario: Eventos del mes actual

- **GIVEN** un evento publicado que aún no ocurre y comienza dentro del mes actual
- **WHEN** el administrador abre el menú **Eventos**
- **THEN** el evento aparece en el listado

#### Scenario: Eventos del mes siguiente

- **GIVEN** un evento publicado que aún no ocurre y comienza dentro del mes siguiente
- **WHEN** el administrador abre el menú **Eventos**
- **THEN** el evento aparece en el listado

#### Scenario: Evento ya ocurrido

- **GIVEN** un evento cuya fecha de término ya pasó
- **WHEN** el administrador abre el menú **Eventos**
- **THEN** el evento no aparece en el listado

#### Scenario: Evento fuera de la ventana de meses

- **GIVEN** un evento que comienza dentro de dos meses o más
- **WHEN** el administrador abre el menú **Eventos**
- **THEN** el evento no aparece en el listado

#### Scenario: Eventos en borrador o cancelados

- **GIVEN** eventos en estado borrador o cancelado dentro de la ventana de meses
- **WHEN** el administrador abre el menú **Eventos**
- **THEN** esos eventos no aparecen en el listado

#### Scenario: Evento cerrado con pendientes

- **GIVEN** un evento cerrado que aún no ocurre y tiene estudiantes sin autorización
- **WHEN** el administrador abre el menú **Eventos**
- **THEN** el evento aparece marcado como cerrado
- **AND** sus pendientes se muestran solo como información

### Requirement: Filtro por curso

El menú **Eventos** SHALL permitir filtrar por uno o varios cursos y SHALL recalcular los eventos y sus contadores al aplicar o limpiar el filtro.

#### Scenario: Filtrar por un curso

- **GIVEN** eventos de varios cursos dentro de la ventana de meses
- **WHEN** el administrador filtra por un curso
- **THEN** solo aparecen los eventos que aplican a ese curso

#### Scenario: Filtrar por varios cursos

- **GIVEN** eventos de tres cursos dentro de la ventana de meses
- **WHEN** el administrador filtra por dos cursos
- **THEN** aparecen los eventos que aplican a al menos uno de los dos cursos

#### Scenario: Limpiar el filtro

- **GIVEN** un filtro por curso aplicado
- **WHEN** el administrador limpia el filtro
- **THEN** vuelve a ver todos los eventos de la ventana de meses

#### Scenario: Curso sin eventos

- **GIVEN** un curso sin eventos dentro de la ventana de meses
- **WHEN** el administrador filtra por ese curso
- **THEN** ve un mensaje que indica que no hay eventos para el curso
- **AND** no ve un error de sistema

### Requirement: Contador de autorizaciones faltantes

Junto al nombre de cada evento, el sistema SHALL mostrar la cantidad de estudiantes aplicables que no tienen autorización vigente y la cantidad total de estudiantes aplicables.

#### Scenario: Conteo con autorizaciones parciales

- **GIVEN** un evento con diez estudiantes aplicables, de los cuales tres tienen autorización vigente
- **WHEN** el administrador ve el menú **Eventos**
- **THEN** el evento muestra siete autorizaciones faltantes de diez estudiantes aplicables

#### Scenario: Evento completo

- **GIVEN** un evento en que todos los estudiantes aplicables tienen autorización vigente
- **WHEN** el administrador ve el menú **Eventos**
- **THEN** el evento muestra cero autorizaciones faltantes
- **AND** se marca como completo

#### Scenario: Autorización anulada vuelve a contar

- **GIVEN** un evento con un estudiante cuya autorización fue anulada
- **WHEN** el administrador ve el menú **Eventos**
- **THEN** ese estudiante cuenta como pendiente

#### Scenario: Evento sin estudiantes aplicables

- **GIVEN** un evento publicado que no aplica a ningún estudiante
- **WHEN** el administrador ve el menú **Eventos**
- **THEN** el evento muestra cero autorizaciones faltantes de cero estudiantes aplicables

### Requirement: Detalle de estudiantes pendientes

Al seleccionar un evento, el sistema SHALL listar los estudiantes aplicables sin autorización vigente, indicando nombre, curso y los apoderados vinculados con su medio de contacto registrado.

#### Scenario: Listado coherente con el contador

- **GIVEN** un evento con siete autorizaciones faltantes
- **WHEN** el administrador abre el evento
- **THEN** ve exactamente siete estudiantes en el listado de pendientes

#### Scenario: Estudiante con más de un apoderado

- **GIVEN** un estudiante pendiente con dos apoderados vinculados
- **WHEN** el administrador abre el detalle del estudiante
- **THEN** ve ambos apoderados
- **AND** ve el medio de contacto registrado de cada uno

#### Scenario: Estudiante ya autorizado

- **GIVEN** un estudiante con autorización vigente para el evento
- **WHEN** el administrador abre el detalle del evento
- **THEN** el estudiante no aparece en el listado de pendientes

#### Scenario: Evento sin pendientes

- **GIVEN** un evento en que todos los estudiantes aplicables tienen autorización vigente
- **WHEN** el administrador abre el detalle del evento
- **THEN** ve un mensaje que indica que todas las autorizaciones están firmadas

#### Scenario: Detalle de evento cerrado

- **GIVEN** un evento cerrado con estudiantes pendientes
- **WHEN** el administrador abre el detalle del evento
- **THEN** ve los pendientes y el estado cerrado del evento
- **AND** no se ofrece ninguna acción para firmar en nombre del apoderado

### Requirement: Orden y zona horaria del listado

El menú **Eventos** SHALL ordenar los eventos por fecha y hora de inicio ascendente y SHALL mostrar las fechas en la zona America/Santiago.

#### Scenario: Orden por fecha de inicio

- **GIVEN** tres eventos en la ventana de meses con distintas fechas de inicio
- **WHEN** el administrador abre el menú **Eventos**
- **THEN** los eventos aparecen del más próximo al más lejano

#### Scenario: Fecha mostrada en zona local

- **GIVEN** un evento que comienza a las 23:30 hora de Chile
- **WHEN** el administrador ve el listado
- **THEN** la fecha mostrada corresponde al día local del evento

### Requirement: Permisos del menú Eventos

El menú **Eventos** y su detalle SHALL estar disponibles solo para usuarios con rol de administrador, validado en el servidor.

#### Scenario: Apoderado intenta acceder

- **GIVEN** un apoderado autenticado
- **WHEN** intenta abrir el menú **Eventos** por URL directa
- **THEN** el servidor rechaza el acceso
- **AND** no muestra datos de estudiantes ni apoderados

#### Scenario: Administrador accede

- **GIVEN** un administrador autenticado
- **WHEN** abre el menú **Eventos**
- **THEN** ve el listado de eventos de la ventana de meses

### Requirement: Contadores actualizados

Los contadores del menú y del detalle SHALL reflejar el estado vigente al momento de abrir la pantalla, incluidas las autorizaciones creadas o anuladas mientras el administrador navega.

#### Scenario: Nueva firma mientras el menú está abierto

- **GIVEN** el menú **Eventos** abierto con siete faltantes
- **WHEN** un apoderado firma una autorización y el administrador actualiza la pantalla
- **THEN** el contador muestra seis faltantes

#### Scenario: Anulación mientras el detalle está abierto

- **GIVEN** el detalle de un evento abierto sin pendientes
- **WHEN** un administrador anula una autorización y actualiza la pantalla
- **THEN** el estudiante aparece en el listado de pendientes
- **AND** el contador aumenta en uno

### Requirement: Privacidad en el seguimiento

El menú y el detalle SHALL mostrar solo los datos necesarios de estudiantes y apoderados, y SHALL excluir documentos de identidad y datos personales de los logs.

#### Scenario: Sin documentos en el detalle

- **GIVEN** un evento con estudiantes pendientes
- **WHEN** el administrador abre el detalle
- **THEN** no se muestran documentos de identidad
- **AND** solo se muestran nombre, curso y medio de contacto de los apoderados

#### Scenario: Logs sin datos personales

- **GIVEN** una consulta al menú o al detalle de un evento
- **WHEN** el sistema registra la consulta en los logs
- **THEN** no incluye nombres, documentos ni datos de contacto
- **AND** registra solo identificadores internos y el resultado de la operación
