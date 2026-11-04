# ICP y personas de la plataforma

El colegio necesita recibir y consultar decisiones confiables de los apoderados sin depender del traslado de papeles por estudiantes. Los apoderados necesitan resolver sus trámites de forma sencilla y saber que quedaron registrados.

| Campo | Valor |
|---|---|
| Estado | Primera versión de descubrimiento; pendiente de validación directa con apoderados |
| Fecha | 2026-11-03 |
| Fuente | Respuestas del responsable del proyecto, quien señala que dirección le comunicó los problemas |
| Contexto funcional | [Documento de producto](00-producto.md) |

Este documento describe el cliente y las personas que usarán la plataforma. Las necesidades identificadas no incorporan funcionalidades automáticamente: `00-producto.md` sigue siendo la fuente de verdad funcional.

## 1. Resumen de perfiles

| Perfil | Papel | Necesidad principal |
|---|---|---|
| Colegio de educación básica | Cliente institucional; ICP inicial basado en un colegio concreto | Centralizar autorizaciones y retiros con información confiable y consultable. |
| Dirección | Principal interesado y usuario operador | Gestionar actividades, identificar firmas pendientes y revisar retiros autorizados. |
| Apoderado | Usuario principal de los trámites familiares | Autorizar actividades y solicitar retiros sin contraseñas ni navegación compleja. |

El estudiante es beneficiario de la solución: se busca evitar que quede excluido de actividades por autorizaciones extraviadas. La persona externa que retira es un dato de la solicitud, no un usuario de la plataforma.

## 2. ICP: colegio de educación básica

### Perfil inicial

Colegio de educación básica de aproximadamente 300 estudiantes, cuya dirección enfrenta pérdida de autorizaciones físicas y coordinación de retiros externos por WhatsApp. Busca gestionar estos procesos digitalmente sin exigir que las familias instalen una aplicación.

El perfil parte de un establecimiento concreto. Su aplicabilidad a otros colegios todavía no se ha validado. El tipo de dependencia, ubicación y presupuesto no fueron informados.

### Problemas y resultados esperados

| Situación actual reportada | Consecuencia | Resultado que busca el colegio |
|---|---|---|
| El papel no llega al apoderado o no vuelve firmado al colegio. | Estudiantes sin autorización deben quedar fuera de actividades. | Recibir las autorizaciones directamente y consultar quiénes faltan por firmar. |
| Los retiros se coordinan por WhatsApp. | Incertidumbre sobre quién retirará al estudiante y si tiene autorización del apoderado. | Consultar los retiros y contar con respaldo de la decisión del apoderado. |
| Se deben repartir y recoger papeles y revisar conversaciones. | Trabajo manual para reunir la información. | Centralizar el registro y dejar de usar WhatsApp como medio oficial de autorización. |

Para los retiros, el responsable del proyecto indica que el aviso debe realizarse **al menos un día antes**. Esto permite consultar el día del retiro quiénes están autorizados; no implica admitir solicitudes para ese mismo día.

### Adopción y decisión

- **Principal interesado y operador:** dirección.
- **Condición de adopción:** que los apoderados entiendan y completen los trámites con facilidad.
- **Barrera reportada:** dificultad de uso o rechazo de los apoderados.
- **Pendiente:** confirmar quién aprueba formalmente la adopción, quién financia la solución y cómo se evalúa el presupuesto.

### Señales de buen encaje por validar en otros colegios

- Pérdida de autorizaciones en el recorrido entre colegio y hogar.
- Necesidad de identificar firmas pendientes y respaldar retiros externos.
- Dirección dispuesta a operar un registro digital centralizado.
- Necesidad de acceso web sin instalación para las familias.

Estas señales son criterios iniciales de descubrimiento, no evidencia de demanda de otros establecimientos.

## 3. Persona operadora: dirección

**Descripción:** persona o equipo de dirección responsable de gestionar las autorizaciones y los retiros en la plataforma. No se han definido cargos internos ni distribución de tareas entre sus integrantes.

**Objetivo:** disponer de información organizada para gestionar actividades y retiros con respaldo del apoderado.

### Tareas y dificultades

| Tarea | Dificultad actual | Qué necesita lograr |
|---|---|---|
| Gestionar autorizaciones de actividades. | Papeles que no llegan y estudiantes sin autorización. | Publicar actividades y consultar autorizaciones registradas. |
| Revisar pendientes. | Información que debe reunirse manualmente. | Identificar qué estudiantes aún no tienen autorización. |
| Gestionar retiros externos. | Avisos distribuidos en conversaciones de WhatsApp. | Revisar solicitudes anticipadas y consultar quién está autorizado para cada fecha. |
| Incorporar a las familias al proceso digital. | Posible dificultad o rechazo de uso. | Que los apoderados completen sus trámites sin perderse en la interfaz. |

**Síntesis de su necesidad:**

> Quiero gestionar las autorizaciones y saber quién puede retirar a cada estudiante, con respaldo del apoderado y sin buscar papeles o conversaciones.

Esta frase es una síntesis del descubrimiento, no una cita textual de dirección.

## 4. Persona principal: apoderado

### Perfil conductual provisional

Apoderado responsable de autorizar actividades y coordinar retiros de sus estudiantes. Puede tener distintos niveles de habilidad digital. Necesita resolver una tarea concreta sin recordar contraseñas ni recorrer menús complejos.

No se asignan edad, género, ocupación o parentesco predominante: no hay evidencia para definirlos. Las necesidades de este perfil provienen del relato del responsable del proyecto y deben contrastarse directamente con apoderados.

| Dimensión | Definición inicial | Evidencia |
|---|---|---|
| Objetivos | Autorizar actividades y coordinar retiros sin que la información se pierda. | Necesidad descrita por el responsable del proyecto. |
| Preocupaciones | Que el estudiante quede fuera de una actividad, que la autorización no llegue o que haya problemas con el retiro. | Atribuidas al perfil; pendientes de entrevista directa. |
| Barreras | Recordar contraseñas y perderse en menús complejos. | Reportadas por el responsable del proyecto dentro del contexto comunicado por dirección. |
| Contexto de uso | Trámites entre otras responsabilidades, con poco tiempo o distracciones. | Hipótesis aceptada por el responsable del proyecto; pendiente de observación. |
| Confirmación | Necesidad de una señal clara de que el trámite se completó; el correo es una posibilidad. | Hipótesis del responsable del proyecto, no preferencia validada de apoderados. |
| Documentos de identidad | Posible preocupación o extrañeza al solicitar fotografías de cédulas. | Hipótesis; se desconoce si la barrera sería confianza, comprensión o dificultad técnica. |

**Síntesis de su necesidad:**

> Quiero autorizar una actividad o informar quién retirará a mi estudiante de forma sencilla y saber que el colegio recibió la información.

Esta frase es una síntesis del descubrimiento, no una cita textual de un apoderado.

### Criterios para evaluar la experiencia

- El apoderado reconoce dónde iniciar el trámite y qué debe hacer a continuación.
- Comprende el resumen de lo que autoriza antes de confirmar.
- Distingue una autorización registrada de una solicitud de retiro pendiente de aprobación.
- Reconoce si el envío terminó correctamente y si necesita realizar otra acción.

Estos criterios orientan futuras pruebas de uso. No se ha medido todavía su cumplimiento con apoderados reales.

## 5. Implicancias y límites del descubrimiento

| Hallazgo | Implicancia |
|---|---|
| Dirección opera la plataforma. | Priorizar la validación del flujo administrativo con dirección. El rol funcional actual de profesor o administrador no se modifica por esta definición de persona. |
| WhatsApp dejaría de ser el medio oficial. | Centralizar autorizaciones y solicitudes en la plataforma. Esto es compatible con usar WhatsApp para acceder mediante enlaces o recibir códigos de verificación. |
| Se busca automatizar las firmas. | El trabajo manual identificado es repartir y recoger papeles y revisar conversaciones. No se ha solicitado firmar automáticamente en nombre del apoderado. |
| Se requiere aviso al menos un día antes. | Mantener la selección de fechas futuras. Si se necesita una hora de corte o 24 horas exactas, debe precisarse antes de especificar esa regla. |
| Podría necesitarse una confirmación por correo. | Validar primero la necesidad y el canal. El alcance funcional actual contempla notificaciones solo para OTP; un correo transaccional requiere una decisión explícita y actualización de producto antes de implementarse. |
| Puede haber inquietud al compartir cédulas. | Investigar la causa y comprobar la comprensión del requisito; no se ha decidido eliminarlo ni cambiarlo. |

## 6. Validación pendiente

| Pregunta | Con quién validarla |
|---|---|
| ¿Con qué frecuencia se pierden autorizaciones y cuántos estudiantes quedan afectados? | Dirección. |
| ¿Quién aprueba y financia la adopción? | Dirección. |
| ¿Quién consulta la información al entregar al estudiante y cómo accede a ella? | Dirección y personal que realiza la entrega. |
| ¿Qué pasos generan dificultades reales al completar el trámite? | Apoderados con distintos niveles de habilidad digital. |
| ¿Qué confirmación les basta y por qué canal la esperan? | Apoderados. |
| ¿Qué les preocupa de adjuntar su cédula y la de una persona externa? | Apoderados. |

La siguiente revisión debe incorporar entrevistas o pruebas de uso con apoderados y resultados concretos de dirección. Las afirmaciones atribuidas a ellos deben conservar su origen hasta contar con evidencia directa.
