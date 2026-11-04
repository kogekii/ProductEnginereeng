# Spec Delta

## Purpose

Permitir al apoderado solicitar retiros para sus estudiantes en fechas concretas, con una persona externa por lote, documentos y confirmación clara del estado de revisión.

## ADDED Requirements

### Requirement: Acceso a retiros y pertenencia de estudiantes
El sistema SHALL ofrecer **Retiro Externo** desde el inicio del apoderado autenticado y SHALL mostrar únicamente sus estudiantes activos vinculados. El servidor MUST validar pertenencia y actividad al enviar.

#### Scenario: Inicio del trámite y caso sin estudiantes
- **GIVEN** un apoderado con sesión activa
- **WHEN** presiona **Retiro Externo**
- **THEN** abre directamente el calendario y puede consultar sus solicitudes
- **AND** si no tiene estudiantes activos vinculados, ve una explicación y no puede continuar un nuevo envío.

#### Scenario: Petición manipulada o sin sesión
- **GIVEN** una petición con un estudiante ajeno o inactivo, o sin sesión
- **WHEN** intenta enviar o consultar retiros
- **THEN** sin sesión recibe `401`; con selección inválida se rechaza el lote completo
- **AND** no se crean retiros ni se revelan datos de otro apoderado.

### Requirement: Calendario de dos meses con selección conservada
El calendario SHALL mostrar el mes actual al entrar y permitir alternar únicamente entre ese mes y el siguiente mediante controles superiores. SHALL conservar días y estudiantes seleccionados al cambiar de mes.

#### Scenario: Selección entre meses y cambio de año
- **GIVEN** el mes actual de diciembre en Santiago
- **WHEN** selecciona días de diciembre, cambia a enero y selecciona otro día
- **THEN** conserva las selecciones de ambos meses y sus estudiantes
- **AND** no puede navegar a noviembre ni febrero.

### Requirement: Fechas habilitadas según Santiago
El sistema MUST permitir solo fechas desde mañana hasta el último día del mes siguiente, de lunes a viernes, según el reloj del servidor en `America/Santiago`. MUST revalidarlas al enviar. Los feriados SHALL carecer de marcas, avisos o restricciones adicionales.

#### Scenario: Hoy, pasado, fines de semana y feriados
- **GIVEN** un calendario dentro de la ventana permitida
- **WHEN** el apoderado revisa sus días
- **THEN** hoy, el pasado, sábados y domingos están inhabilitados
- **AND** un feriado futuro de lunes a viernes tiene el mismo comportamiento que un día ordinario.

#### Scenario: Cruce de medianoche o mes durante el trámite
- **GIVEN** una selección que era válida y un dispositivo en otra zona horaria
- **WHEN** el día o mes cambia en Santiago antes del envío y alguna fecha deja de ser válida
- **THEN** se rechaza el lote, se indican las fechas que debe corregir y se conserva el resto del formulario
- **AND** no se usa el reloj ni la zona horaria del dispositivo como autoridad.

### Requirement: Todos sus estudiantes por defecto con ajuste opcional
Cada día nuevo SHALL incluir a todos los estudiantes activos vinculados al apoderado. SHALL permitir cambiar en una sola acción la selección de los días no personalizados y ofrecer **Cambiar estudiantes por día** para ajustar una fecha sin alterar las demás. Cada día MUST tener al menos un estudiante al continuar.

#### Scenario: Caso rápido sin personalizaciones
- **GIVEN** un apoderado con dos estudiantes activos vinculados y un tercero inactivo
- **WHEN** selecciona dos días y continúa sin abrir ajustes
- **THEN** ambos días incluyen a los dos estudiantes activos y excluyen al inactivo
- **AND** ve los nombres incluidos antes de continuar y en el resumen.

#### Scenario: Ajuste común y excepción por fecha
- **GIVEN** dos días con ambos estudiantes seleccionados
- **WHEN** personaliza el segundo día dejando solo un estudiante y luego aplica una selección común al resto
- **THEN** el segundo día conserva su personalización y solo cambian los días no personalizados
- **AND** puede restaurar explícitamente una fecha a la selección común actual.

#### Scenario: Nuevo día después de ajustar otros
- **GIVEN** días existentes con ajustes comunes o personalizados
- **WHEN** agrega otra fecha o vuelve a seleccionar una fecha que había quitado
- **THEN** ese día nuevo empieza con todos sus estudiantes activos seleccionados y lo indica visiblemente
- **AND** los ajustes de las otras fechas se conservan.

#### Scenario: Día vacío o retiro del día
- **GIVEN** una fecha seleccionada
- **WHEN** desmarca a su último estudiante
- **THEN** ve un error y no puede continuar hasta seleccionar alguno o quitar la fecha
- **AND** quitar una fecha elimina únicamente sus pares del resumen.

### Requirement: Una persona externa por lote
El lote MUST contener exactamente una persona externa con nombres, apellidos, tipo y número de documento y parentesco o vínculo. El RUT MUST normalizarse y validar su dígito verificador; el pasaporte MUST contener un número no vacío. El externo SHALL aplicar a todos los pares estudiante–fecha.

#### Scenario: Identidad común y datos inválidos
- **GIVEN** varios días con distintos estudiantes
- **WHEN** registra al externo
- **THEN** ingresa sus datos una sola vez para todos los retiros
- **AND** un RUT inválido, campos obligatorios vacíos o más de un externo bloquean el envío con mensajes junto a los campos.

### Requirement: Documentos distintos en orden y de la misma solicitud
El flujo MUST exigir primero un documento del apoderado y luego uno del externo, una vez cada uno por lote. MUST validar en servidor propietario, tipo, existencia, orden de carga y no reutilización en otro envío. SHALL admitir JPG, PNG y PDF de hasta 10 MB, con validación del contenido.

#### Scenario: Carga secuencial y corrección sin repetir todo
- **GIVEN** un lote con días y externo definidos
- **WHEN** adjunta el documento del apoderado correctamente
- **THEN** se habilita la carga del externo
- **AND** si falla la segunda carga puede reintentarla sin volver a adjuntar la primera ni perder la selección.

#### Scenario: Documento inválido, ajeno, repetido o cargado fuera de orden
- **GIVEN** falta un documento, ambos IDs son iguales, un archivo excede 10 MB, tiene contenido incompatible, pertenece a otro usuario, ya respalda otro envío o el externo se cargó antes que el documento del apoderado elegido
- **WHEN** intenta cargarlo o confirmar el lote
- **THEN** recibe un error explícito y no se crea la solicitud
- **AND** el modo demostración no permite omitir ni sustituir automáticamente los dos documentos de un retiro.

### Requirement: Resumen obligatorio y navegación sin pérdida
Antes del envío el sistema SHALL mostrar fechas, estudiantes por fecha, identidad del externo, estado de ambos documentos y propósito del retiro. SHALL permitir volver a corregir y regresar al resumen actualizado sin perder datos durante la navegación. MUST explicar que el envío requiere revisión del colegio.

#### Scenario: Revisar y corregir
- **GIVEN** un formulario completo
- **WHEN** abre el resumen, vuelve y cambia un estudiante de una fecha
- **THEN** el resumen siguiente refleja exactamente ese cambio y conserva el externo y los documentos válidos
- **AND** no existe una confirmación habilitada sin fechas, estudiantes, externo y ambos documentos.

### Requirement: Envío íntegro y sin conflictos de estudiante y fecha
El sistema MUST crear una solicitud pendiente con todos sus pares estudiante–fecha o rechazar todo el lote. MUST impedir pares repetidos y solicitudes activas (`PENDING_REVIEW` o `APPROVED`) superpuestas, incluso entre apoderados distintos. SHALL informar conflictos sin revelar la identidad del otro solicitante.

#### Scenario: Un par en conflicto impide todo el envío
- **GIVEN** un lote de tres pares y uno ya incluido en una solicitud activa
- **WHEN** confirma
- **THEN** no se crea ninguno de los tres pares ni una solicitud parcial
- **AND** se indica el estudiante propio y la fecha en conflicto para corregir.

#### Scenario: Solicitudes simultáneas de distintos apoderados
- **GIVEN** dos apoderados vinculados al mismo estudiante y envíos simultáneos para la misma fecha
- **WHEN** se procesan
- **THEN** solo uno queda pendiente y el otro recibe un conflicto recuperable
- **AND** los pares adicionales del lote rechazado tampoco se registran.

### Requirement: Reintentos idempotentes
El sistema MUST identificar el envío mediante una clave asociada al apoderado. Repetir la misma clave y contenido SHALL devolver la misma solicitud sin duplicar pares, documentos asociados ni auditoría de envío. Reusar esa clave con contenido distinto MUST producir conflicto.

#### Scenario: Respuesta perdida y doble confirmación
- **GIVEN** un lote registrado cuya respuesta no llegó al navegador
- **WHEN** el apoderado reintenta con la misma clave y contenido, incluso simultáneamente
- **THEN** recibe el mismo identificador y un solo envío registrado
- **AND** si cambió el contenido debe usar una nueva clave.

### Requirement: Recepción y consulta de estados propios
Tras enviar, el sistema SHALL confirmar recepción con identificador y **Pendiente de revisión**, aclarando que aún no habilita el retiro. SHALL permitir consultar solo solicitudes propias con días, estudiantes, externo, estado y motivo si fue rechazada. Una solicitud rechazada SHALL permitir una nueva solicitud sin editar el historial.

#### Scenario: Distinguir recibido de aprobado
- **GIVEN** una solicitud recién enviada
- **WHEN** abre el resultado o vuelve a sus solicitudes
- **THEN** ve **Pendiente de revisión**, no una autorización de retiro
- **AND** después de la revisión ve **Aprobada** o **Rechazada** con su motivo, según corresponda.

#### Scenario: Nueva solicitud después del rechazo
- **GIVEN** una solicitud rechazada para un estudiante y fecha aún elegible
- **WHEN** envía una nueva solicitud corregida con documentos nuevos
- **THEN** el rechazo previo no bloquea el par y ambas solicitudes conservan su historial.

### Requirement: Documentos privados y trazabilidad
El sistema MUST mantener ambos documentos fuera de URLs públicas, descargarlos solo con autorización y evitar datos personales o imágenes en logs. SHALL registrar el resumen aceptado y la evidencia del envío; SHALL conservar los metadatos de retención de 12 meses sin presentar un documento vencido o eliminado como disponible.

#### Scenario: Acceso privado y documento eliminado
- **GIVEN** documentos de una solicitud propia
- **WHEN** consulta el apoderado dueño, un tercero o un usuario sin sesión
- **THEN** solo el dueño puede descargarlos por esa vía, con respuesta sin caché; el administrador se rige por la revisión administrativa
- **AND** si un documento venció o se eliminó, se informa su indisponibilidad sin perder el estado ni el historial de la solicitud.

### Requirement: Experiencia móvil comprensible
El flujo SHALL usar español de Chile y la marca del colegio, con etiquetas visibles, foco de teclado, fechas accesibles y estados de carga, vacío y error. SHALL funcionar a 320 px sin desplazamiento horizontal y sin depender solo del color o del acceso a cámara.

#### Scenario: Navegador móvil o cámara no disponible
- **GIVEN** un apoderado usando un navegador móvil, incluido el interno de WhatsApp
- **WHEN** recorre calendario, ajustes y documentos
- **THEN** reconoce los días seleccionados, los estudiantes incluidos y la acción siguiente
- **AND** puede seleccionar un archivo si la cámara no está disponible y reintentar errores sin reiniciar el trámite.
