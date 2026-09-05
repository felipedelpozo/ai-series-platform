# Feature Specification: Copiloto Creativo Conversacional

**Feature Branch**: `feature/029-conversational-creation`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Convertir la página principal en un copiloto conversacional que
permita crear y modificar recursos creativos mediante propuestas estructuradas, diff visible,
aprobación humana explícita y escritura transaccional sobre el canon existente."

## Clarifications

### Session 2026-09-05

- Q: ¿Qué número corresponde a esta feature? → A: Feature 028 ya está ocupada por BeUI Visual
  Refresh; la siguiente posición real de la secuencia global es Feature 029.
- Q: ¿Qué autoridad tiene el lenguaje natural dentro del chat? → A: Puede consultar, orientar,
  preparar o revisar propuestas; nunca autoriza una mutación canónica, aunque la persona diga
  «adelante», «aplica», «sí» o una expresión equivalente.
- Q: ¿Cómo se aprueba una propuesta? → A: Mediante una acción explícita fuera del texto libre,
  vinculada a una revisión y fingerprint exactos. Cualquier cambio posterior en la propuesta o en
  su base canónica invalida esa aprobación.
- Q: ¿Qué ocurre cuando una acción además puede consumir créditos? → A: Requiere una confirmación
  de coste separada, con estimación visible y alcance identificado, incluso si el cambio canónico ya
  fue aprobado.
- Q: ¿Cuál es el alcance prioritario de la primera entrega? → A: Portada conversacional, contexto
  activo, creación completa de Series Bible y entidades, primer episodio con plan, escenas y guion
  estructurado, revisión/diff/aplicación, historial y enlaces a los estudios existentes. La creación
  o modificación conversacional de otros recursos canónicos existentes conserva las mismas
  garantías y se prioriza después de ese recorrido vertical.
- Q: ¿Dónde vive el estado resultante? → A: En los dominios canónicos existentes. La conversación y
  sus propuestas conservan historial y trazabilidad, pero no forman una fuente de verdad paralela
  ni reemplazan Series Workspace o Episode Studio.
- Q: ¿Incluye esta entrega temporadas o episodios como entidades nuevas? → A: No. El catálogo
  aplicable se limita a los recursos que ya tienen un modelo canónico: Series, Series Bible,
  personajes, localizaciones, props, EpisodePlan, Scene y Shot. «Episodio» es el agregado vigente de
  EpisodePlan/Scene/Shot y «guion» vive en Scene; Season y otros tipos sin dominio canónico se
  devuelven como no soportados para mutación.
- Q: ¿Cómo se gobierna el coste de la inferencia del propio copiloto? → A: Antes de cada llamada real
  se muestra y confirma una cota máxima de coste para ese mensaje o borrador. Cada intento registra
  proveedor, modelo, prompt versionado, uso, duración y coste estimado o real, bajo límites por usuario
  y workspace. Las respuestas deterministas que no llaman a un proveedor no consumen esa confirmación.
- Q: ¿Cómo se protege la autenticación por cookie? → A: Las sesiones usan cookies Secure, HttpOnly y
  SameSite=Lax; toda mutación autenticada por cookie exige Origin/Host del mismo sitio. Bearer conserva
  la misma autorización y rate limit, aunque no use credenciales ambientales del navegador.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Crear una serie completa desde la portada (Priority: P1)

Una persona creadora describe una idea en la portada conversacional, completa la información que
falte y obtiene una propuesta estructurada de serie con Series Bible, personajes, localizaciones y
props. Puede editarla, comparar revisiones y revisar el diff antes de decidir si la aplica.

**Why this priority**: Es el recorrido vertical mínimo que convierte una intención creativa en un
borrador útil sin sacrificar control humano ni integridad del canon.

**Independent Test**: Partir de un workspace sin series, conversar hasta completar una propuesta,
editar un personaje, revisar el diff, aprobar la revisión exacta y comprobar que la serie y sus
recursos quedan creados juntos y accesibles desde Series Workspace.

**Acceptance Scenarios**:

1. **Given** una persona con permiso de edición y sin contexto de serie activo, **When** describe una
   nueva serie, **Then** el copiloto recopila solo la información necesaria y prepara una propuesta
   estructurada sin crear aún datos canónicos.
2. **Given** una propuesta válida y lista para revisar, **When** la persona edita un campo o una
   entidad, **Then** se crea una nueva revisión y puede comparar tanto sus revisiones como el cambio
   completo frente al canon actual.
3. **Given** una revisión cuyo diff está visible, **When** la persona escribe «adelante» en el chat,
   **Then** la propuesta permanece sin aplicar y la interfaz sigue esperando una aprobación
   explícita asociada a esa revisión.
4. **Given** una propuesta válida aprobada mediante el control explícito, **When** se aplica,
   **Then** serie, Bible, personajes, localizaciones y props se escriben como una única operación o
   no se escribe ninguno, y se muestra un recibo trazable.
5. **Given** una propuesta rechazada o descartada, **When** la persona continúa conversando,
   **Then** el canon no cambia y el historial conserva la decisión sin volver a presentar la
   propuesta como pendiente.

---

### User Story 2 - Crear el primer episodio dentro del contexto correcto (Priority: P1)

Una persona selecciona una serie o entra desde ella y conversa para crear su primer episodio. El
copiloto adopta automáticamente ese contexto y propone un plan, escenas y guion estructurado
coherentes con la Series Bible, las entidades y el Story State vigentes.

**Why this priority**: Demuestra que el copiloto no es solo un formulario de alta, sino una entrada
creativa segura que reutiliza la continuidad y el flujo de producción existentes.

**Independent Test**: Seleccionar una serie con canon conocido, solicitar el primer episodio,
provocar y resolver una contradicción de continuidad, aprobar la revisión resultante y abrir el
episodio creado en Episode Studio.

**Acceptance Scenarios**:

1. **Given** una serie seleccionada, **When** la persona abre o continúa la conversación, **Then** el
   contexto activo identifica permanentemente workspace y serie, y toda propuesta queda limitada a
   ese ámbito.
2. **Given** una serie con Bible, entidades y Story State vigentes, **When** se solicita el primer
   episodio, **Then** la propuesta incluye plan y escenas ordenadas cuyo propósito, acción, diálogo y
   continuidad forman el guion estructurado, identifica su snapshot canónico de partida y no crea
   todavía ninguna revisión canónica.
3. **Given** una propuesta que contradice el canon, **When** finaliza la validación, **Then** pasa a
   «conflicto de continuidad», muestra los hallazgos y bloquea la aprobación hasta que se resuelvan o
   una política canónica existente permita documentar la excepción.
4. **Given** una propuesta válida de episodio, **When** la persona aprueba y aplica su revisión
   exacta, **Then** el plan y las escenas que representan el episodio y su guion estructurado se
   escriben de forma transaccional, conservan las relaciones canónicas y ofrecen un enlace directo a
   Episode Studio.
5. **Given** que otra acción modifica la serie entre la revisión y la aplicación, **When** se intenta
   aplicar la propuesta anterior, **Then** se rechaza como «borrador desactualizado», no se realiza
   ninguna escritura y se ofrece recalcular el diff sobre el canon vigente.

---

### User Story 3 - Consultar y modificar recursos existentes (Priority: P2)

Una persona utiliza el mismo chat para preguntar por su producción o proponer cambios sobre Series,
Series Bible, EpisodePlan, escenas, shots, personajes, localizaciones y props canónicos a los que
tenga acceso. Los conceptos todavía sin modelo canónico, como Season, son consultables pero no
mutables desde esta entrega.

**Why this priority**: Convierte la portada en una entrada global coherente sin duplicar cada estudio
especializado ni debilitar sus controles.

**Independent Test**: Consultar un shot sin producir propuestas; después solicitar un cambio que
afecte a varios recursos, revisar el impacto y aplicar solo la revisión explícitamente aprobada.

**Acceptance Scenarios**:

1. **Given** una consulta que no propone cambios, **When** la persona la envía, **Then** el copiloto
   responde con datos del contexto autorizado sin crear propuesta, pedir aprobación ni modificar el
   canon.
2. **Given** una solicitud de modificación, **When** el copiloto puede expresarla como cambios
   estructurados válidos, **Then** crea una propuesta con cada alta, edición, archivado o relación
   prevista y su diff, pero no ejecuta ninguna mutación.
3. **Given** una propuesta que afecta a varios recursos, **When** la persona la revisa, **Then** puede
   inspeccionar el impacto por recurso, comparar revisiones y aprobar o rechazar el conjunto exacto
   sin que una aprobación parcial implícita altere dependencias.
4. **Given** un recurso seleccionado en Series Workspace o Episode Studio, **When** se abre el
   copiloto con ese contexto, **Then** muestra el recurso activo y ofrece volver al estudio
   especializado sin perder la conversación ni crear una vista paralela de producción.

---

### User Story 4 - Confirmar por separado un trabajo con coste (Priority: P2)

Una persona puede pedir desde la conversación un trabajo generativo existente que consuma créditos,
pero ve el alcance y una estimación de coste antes de decidir si lo inicia.

**Why this priority**: El control editorial sobre el canon y el control económico son decisiones
distintas; ambas deben ser conscientes, auditables e idempotentes.

**Independent Test**: Preparar una acción que requiera una mutación aprobada y un trabajo de pago,
aprobar solo el cambio canónico y verificar que el trabajo no comienza hasta confirmar además el
coste estimado.

**Acceptance Scenarios**:

1. **Given** una acción generativa con coste estimable, **When** queda lista para iniciarse, **Then**
   muestra proveedor o modalidad, alcance, unidades afectadas y coste estimado antes de solicitar
   confirmación.
2. **Given** una mutación canónica aprobada que implica trabajo con coste, **When** aún no existe
   confirmación económica válida, **Then** no se inicia el trabajo de pago; los cambios canónicos
   solo pueden aplicarse por separado cuando la propuesta y su diff los declaran independientes de
   ese trabajo.
3. **Given** una confirmación económica vinculada a un alcance exacto, **When** la petición se repite
   por doble pulsación, recarga o reintento, **Then** se inicia como máximo un trabajo facturable.
4. **Given** que la estimación, el alcance o la revisión cambian, **When** se intenta reutilizar una
   confirmación anterior, **Then** se exige una nueva confirmación antes de gastar créditos.

---

### User Story 5 - Revisar, recuperar y continuar el trabajo (Priority: P3)

Una persona vuelve a una conversación anterior y comprende qué se preguntó, qué propuestas se
prepararon, cuáles fueron aprobadas o rechazadas, qué se aplicó y qué necesita atención.

**Why this priority**: Las sesiones creativas son largas y pueden interrumpirse; el historial debe
permitir recuperar el estado real sin confiar en memoria informal.

**Independent Test**: Interrumpir una conversación en cada estado operativo, volver a abrirla y
verificar que el estado, contexto, propuesta y siguiente acción se reconstruyen sin duplicar efectos.

**Acceptance Scenarios**:

1. **Given** una conversación existente, **When** la persona vuelve a ella, **Then** ve mensajes,
   revisiones de propuesta, validaciones, decisiones, aplicaciones y contexto asociado en orden
   trazable.
2. **Given** una aplicación interrumpida o de resultado incierto, **When** se recupera la sesión,
   **Then** se reconcilia primero el resultado real antes de permitir un reintento y nunca se presenta
   un éxito no confirmado.
3. **Given** un error recuperable antes de escribir canon, **When** la persona reintenta, **Then** se
   conserva su entrada y la propuesta vigente, y el reintento no crea una revisión duplicada ni un
   efecto canónico duplicado.

### Edge Cases

- No existe contexto activo y la petición podría referirse a crear una serie nueva o modificar una
  existente; el copiloto solicita la selección mínima necesaria antes de preparar el borrador.
- La persona cambia de serie o episodio mientras se prepara una propuesta; la respuesta tardía no
  sustituye el contexto visible ni se asocia al nuevo ámbito.
- Dos respuestas se completan fuera de orden; la respuesta antigua queda trazada, pero no reemplaza
  el borrador vigente ni recupera como activa una propuesta ya descartada.
- El recurso activo se archiva, elimina o deja de ser accesible desde otra sesión; la conversación
  conserva el historial, pero bloquea nuevas propuestas sobre ese recurso y explica el cambio.
- Una conversación global contiene propuestas de más de una serie; cada propuesta conserva un único
  contexto explícito y no puede mezclar canon entre series o workspaces.
- El rol de la persona cambia de editor a viewer durante la revisión o aplicación; puede consultar
  el historial autorizado, pero la aprobación/aplicación se rechaza sin efectos parciales.
- Una propuesta contiene referencias inexistentes, relaciones cíclicas, campos obligatorios vacíos,
  orden inválido o recursos pertenecientes a otro workspace; la validación bloquea la aprobación.
- El modelo devuelve un identificador inexistente, archivado, ajeno al contexto o perteneciente a
  otro workspace; se rechaza como entrada no confiable sin revelar información del recurso.
- Dos personas editan o aprueban revisiones distintas de la misma propuesta; solo puede aplicarse
  una revisión todavía vigente y las demás pasan a desactualizadas con motivo visible.
- El canon cambia después de generar el diff pero antes de aprobar; el diff se invalida y debe
  recalcularse antes de mostrar de nuevo la acción de aprobación.
- Se recibe dos veces la misma aprobación o solicitud de aplicación; el resultado y el recibo son
  los mismos y no se duplican recursos, versiones, costes ni trabajos.
- El diff no contiene cambios efectivos; se informa de ello y no se habilita aprobación ni
  aplicación para una revisión vacía.
- Solo una parte de una propuesta supera la validación; se detallan los resultados por recurso, pero
  no se permite aprobar el conjunto como válido ni aplicarlo parcialmente bajo la misma revisión.
- La aplicación falla en uno de varios recursos; la transacción completa se revierte y el estado
  pasa a error recuperable sin afirmar que una parte quedó aplicada.
- La escritura concluye pero la respuesta agota su tiempo antes de mostrar el recibo; la recuperación
  reconcilia el resultado existente antes de permitir otro intento y no repite la mutación.
- La estimación de coste no está disponible; el trabajo pagado no se inicia y se explica que la
  confirmación no puede completarse todavía.
- El coste o la cuota cambian tras la confirmación, o ya existe un trabajo equivalente enviado,
  activo o completado; la confirmación caduca y no se crea un trabajo facturable duplicado.
- El trabajo pagado tarda, falla o agota reintentos; la conversación muestra el estado real, ofrece
  la recuperación permitida y no inicia automáticamente un trabajo nuevo.
- El contenido del usuario intenta ordenar al copiloto ignorar permisos, ocultar el diff, autoaprobar
  o revelar datos de otro contexto; esas instrucciones no alteran las reglas ni amplían el acceso.
- El borrador o diff es demasiado extenso para una sola vista; se conserva la navegación por
  recurso, la posición y el acceso a la acción pendiente sin ocultar cambios.
- La red se pierde en móvil al cambiar entre Chat y Borrador; el contenido ya recibido permanece y
  ninguna acción se interpreta como aprobada por el cambio de pestaña o la reconexión.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La página principal DEBE ser una entrada conversacional al trabajo creativo y DEBE
  ofrecer acceso explícito a conversaciones anteriores, Series Workspace y Episode Studio.
- **FR-002**: El copiloto DEBE operar con un contexto activo de exactamente uno de estos niveles:
  workspace global, serie o episodio, y DEBE adoptar automáticamente la serie o episodio
  seleccionado cuando se acceda desde ese ámbito.
- **FR-003**: Workspace, serie, episodio y recurso activo, cuando existan, DEBEN permanecer visibles
  durante la conversación y la revisión; cualquier cambio de contexto DEBE ser inequívoco antes de
  afectar nuevas respuestas o propuestas.
- **FR-004**: Toda lectura, consulta, propuesta, aprobación, aplicación y trabajo generativo DEBE
  respetar el workspace, rol y permisos vigentes tanto al prepararse como al ejecutarse.
- **FR-005**: Las consultas de solo lectura DEBEN poder completarse sin aprobación y DEBEN
  distinguirse visual y semánticamente de una propuesta de cambio.
- **FR-006**: Toda solicitud que pueda alterar datos canónicos DEBE convertirse primero en una
  propuesta estructurada, editable y validable; la conversación por sí sola NO DEBE modificar el
  canon.
- **FR-007**: Las propuestas DEBEN representar las operaciones que permiten los dominios canónicos
  vigentes: alta, renombrado y archivado de Series; nuevas revisiones de Series Bible, Character,
  Location, Prop y EpisodePlan; y nuevos agregados ordenados de Scene/Shot. Los tipos sin dominio
  canónico, incluida Season, DEBEN rechazarse como no soportados y nunca persistirse como JSON genérico
  o canon paralelo.
- **FR-008**: La primera entrega DEBE permitir crear como un solo conjunto revisable una serie, su
  Series Bible, personajes, localizaciones y props, sin sustituir las capacidades de las Features
  008 y 009.
- **FR-009**: La primera entrega DEBE permitir crear dentro de una serie un primer episodio con plan,
  escenas ordenadas y guion estructurado, preservando las relaciones y validaciones de las Features
  011, 012 y 013.
- **FR-010**: Cada propuesta DEBE declarar su contexto, intención, recursos afectados, cambios
  propuestos, dependencias, base canónica, autoría, fecha y estado.
- **FR-011**: Cada edición de una propuesta DEBE crear una revisión inmutable con fingerprint propio;
  las revisiones previas y sus decisiones DEBEN permanecer consultables.
- **FR-012**: La persona DEBE poder editar el contenido estructurado, comparar revisiones y descartar
  una propuesta sin modificar el canon.
- **FR-013**: Antes de poder aprobarse, cada revisión DEBE superar validación estructural, de dominio,
  permisos, relaciones y continuidad contra un snapshot canónico explícito.
- **FR-014**: Los hallazgos de validación DEBEN identificar el recurso y campo afectados, explicar
  por qué bloquean o advierten y ofrecer una vía de corrección cuando exista.
- **FR-015**: La revisión DEBE mostrar un diff completo y comprensible frente al canon vigente,
  incluyendo creaciones, cambios, archivados, relaciones e impacto sobre dependencias.
- **FR-016**: El control de aprobación DEBE estar separado del texto libre y vinculado a un único
  identificador de revisión y fingerprint exacto; expresiones conversacionales como «adelante» NO
  DEBEN producir ni equivaler a una aprobación.
- **FR-017**: Una aprobación DEBE ser de un solo uso para la revisión exacta; editar la propuesta,
  cambiar su contexto, modificar su base canónica o alterar el diff DEBE invalidarla.
- **FR-018**: Rechazar o descartar una propuesta DEBE cerrar su capacidad de aplicación, conservar
  la decisión en el historial y no modificar ningún recurso canónico.
- **FR-019**: La aplicación de una propuesta DEBE volver a verificar revisión, fingerprint, contexto,
  permisos, base canónica, validaciones y aprobación inmediatamente antes de escribir.
- **FR-020**: Todos los cambios canónicos contenidos en una propuesta aprobada DEBEN aplicarse como
  una única operación transaccional: o quedan todos confirmados o no queda ninguno.
- **FR-021**: La aplicación DEBE ser idempotente ante aprobaciones, pulsaciones, reintentos o
  entregas repetidas y DEBE devolver el mismo resultado confirmado sin duplicar efectos.
- **FR-022**: Una aplicación correcta DEBE producir un recibo inmutable que relacione conversación,
  propuesta, revisión aprobada, fingerprint, persona que aprobó, contexto y versiones canónicas
  creadas o activadas.
- **FR-023**: Si el canon o los permisos cambian desde la validación, la propuesta DEBE pasar a
  «borrador desactualizado» o «necesita información», según corresponda, sin realizar escrituras y
  con opción de recalcular sobre el estado vigente.
- **FR-024**: Las operaciones conversacionales DEBEN usar los dominios, reglas, historiales y
  fuentes de verdad existentes; NO DEBEN duplicar Series Workspace, Episode Studio, Story State,
  historial de generaciones ni ningún modelo canónico.
- **FR-025**: Las propuestas de episodio DEBEN usar la Series Bible, entidades y Story State
  explícitamente vigentes, y DEBEN preservar el snapshot empleado para que la continuidad no dependa
  de la memoria del modelo.
- **FR-026**: El copiloto DEBE poder enlazar al recurso aplicado en Series Workspace o Episode Studio
  y esos estudios DEBEN seguir siendo las superficies especializadas para producción detallada,
  QA, preview y operaciones sobre shots.
- **FR-027**: Las conversaciones, mensajes, cambios de contexto, revisiones de propuesta,
  validaciones, aprobaciones, rechazos, confirmaciones de coste, aplicaciones y recibos DEBEN
  conservar un historial cronológico e inmutable conforme a la política de retención del workspace.
- **FR-028**: El historial conversacional NO DEBE ser la única fuente de ningún hecho canónico, regla
  de continuidad, permiso, aprobación, coste ni resultado operativo.
- **FR-029**: El flujo DEBE exponer los estados «recopilando contexto», «preparando borrador», «listo
  para revisar», «esperando aprobación», «aplicando» y «aplicado», además de «necesita información»,
  «conflicto de continuidad», «borrador desactualizado» y «error recuperable», con siguiente acción
  y causa cuando corresponda; «rechazada» y «descartada» DEBEN conservarse como resultados
  terminales auditables.
- **FR-030**: «Esperando aprobación» solo DEBE alcanzarse tras validación satisfactoria y diff
  visible; durante «aplicando» se DEBEN bloquear la edición y aplicaciones duplicadas, y «aplicado»
  DEBE identificar el recibo y las versiones canónicas resultantes. Los estados recuperables DEBEN
  volver al último estado seguro sin perder la entrada de la persona.
- **FR-031**: En escritorio, la experiencia DEBE presentar el chat y el borrador o preview vivo de
  forma simultánea, con el chat a la izquierda y la revisión a la derecha, sin ocultar contexto,
  estado o acción pendiente.
- **FR-032**: En móvil, Chat y Borrador DEBEN estar disponibles como vistas equivalentes mediante
  pestañas; cambiar de pestaña NO DEBE perder contenido, contexto, estado ni posición relevante.
- **FR-033**: La persona DEBE poder operar el recorrido principal mediante teclado y tecnologías de
  asistencia, con foco visible, orden lógico, labels, anuncios de estado y contraste WCAG AA en los
  temas soportados.
- **FR-034**: La experiencia DEBE evitar overflow horizontal de página y conservar todas las
  acciones esenciales en 375, 768, 1024, 1280 y 1440 px.
- **FR-035**: Antes de iniciar cualquier trabajo generativo que pueda consumir créditos, el sistema
  DEBE mostrar una estimación de coste, moneda, vigencia, alcance, unidades afectadas, atribución al
  contexto y cuota disponible.
- **FR-036**: Un trabajo generativo con coste DEBE exigir una confirmación explícita adicional,
  separada de la aprobación canónica y vinculada a usuario, workspace, alcance, estimación y cuota
  vigentes, además de la revisión para trabajos de propuesta o del mensaje/borrador para inferencias del
  copiloto.
- **FR-037**: Si la estimación, alcance, revisión, permisos o cuota cambian, la confirmación económica
  anterior DEBE quedar inválida y el trabajo NO DEBE comenzar hasta una nueva confirmación.
- **FR-038**: La iniciación de trabajos con coste DEBE ser idempotente y NO DEBE crear más de un
  trabajo facturable para la misma intención confirmada, aunque existan dobles pulsaciones, reintentos
  o sesiones concurrentes.
- **FR-039**: Los errores y límites externos DEBEN presentarse sin secretos, datos de otros
  workspaces, instrucciones internas ni contenido sensible innecesario, y nunca DEBEN ampliar el
  contexto autorizado a partir de instrucciones del chat.
- **FR-040**: El recorrido prioritario DEBE poder validarse sin ejecutar servicios de pago; cualquier
  aceptación live que consuma créditos DEBE ser separada, opt-in y reportada como tal.
- **FR-041**: Cada intención o parte separable de una petición mixta DEBE clasificarse explícitamente
  como consulta, propuesta, mutación canónica o trabajo generativo con coste; ninguna categoría DEBE
  heredar aprobación o confirmación de otra.
- **FR-042**: Toda propuesta DEBE fijar su workspace, serie, episodio, recursos objetivo y bases al
  crear la revisión; un cambio posterior del contexto visible NO DEBE retargetearla silenciosamente.
- **FR-043**: Toda aprobación DEBE quedar ligada además al usuario y workspace que la emitieron, y
  DEBE ser inutilizable por otro actor, workspace, revisión o fingerprint.
- **FR-044**: Inmediatamente antes de aplicar, el sistema DEBE revalidar rol, membresía, ownership,
  workspace, targets, archivado, bases canónicas y continuidad, además de la aprobación exacta.
- **FR-045**: Un viewer DEBE poder realizar únicamente consultas autorizadas y revisar historial; NO
  DEBE poder aprobar, aplicar, confirmar gasto ni provocar una propuesta que eluda ese límite.
- **FR-046**: Mensajes, canon, assets, contenido recuperado e identificadores devueltos por el modelo
  DEBEN tratarse como entrada no confiable y NO DEBEN poder cambiar permisos, contexto protegido,
  clasificación, validaciones ni gates de aprobación o coste.
- **FR-047**: Aplicaciones y trabajos con coste DEBEN deduplicarse también ante concurrencia entre
  pestañas, sesiones o actores; un trabajo equivalente enviado, activo o con resultado reutilizable
  DEBE devolverse en lugar de iniciar otro gasto.
- **FR-048**: El guion estructurado DEBE representarse sobre las escenas canónicas de Feature 013,
  incluidos propósito, acción, diálogo, entidades y continuidad; NO DEBE existir un dominio de
  screenplay paralelo.
- **FR-049**: Toda inferencia real del copiloto DEBE exigir antes una cota máxima visible y confirmación
  económica exacta para ese mensaje o borrador, registrar proveedor, modelo, propósito y versión de
  prompt, uso, duración, coste estimado y coste real cuando esté disponible, y respetar límites por
  usuario y workspace. Una respuesta determinista sin proveedor no consume confirmación.
- **FR-050**: Los comandos autenticados mediante cookie DEBEN rechazar solicitudes cross-site antes
  de clasificar, aprobar, aplicar o confirmar gasto; los límites de frecuencia DEBEN aplicarse por
  usuario, workspace y clase de operación sin confiar en una IP aportada por el cliente.
- **FR-051**: Una revisión mixta DEBE declarar para cada trabajo pagado si es independiente del cambio
  canónico o exige un recibo aplicado. El inicio pagado DEBE exigir la aprobación editorial exacta y,
  cuando corresponda, el recibo exacto además de la confirmación económica.
- **FR-052**: Los mensajes de usuario y revisiones editadas DEBEN usar identificadores cliente
  obligatorios y únicos dentro de su conversación o propuesta, de modo que reintentos concurrentes
  devuelvan el mismo registro sin duplicar historial.

### Key Entities

- **Conversation**: sesión creativa perteneciente a un workspace; agrupa mensajes, contexto,
  propuestas y resultados sin convertirse en autoridad canónica.
- **Conversation Message**: entrada o respuesta inmutable con autor, orden, fecha, tipo y referencias
  a los artefactos estructurados que produjo o explicó.
- **Active Context**: ámbito autorizado de workspace, serie o episodio que identifica las versiones
  canónicas relevantes y el recurso seleccionado en un momento de la conversación.
- **Proposal**: intención de cambio estructurada, aislada del canon y asociada a una conversación y
  a un único contexto.
- **Proposal Revision**: snapshot inmutable y editable mediante una revisión posterior; contiene
  fingerprint, base canónica, recursos afectados, cambios, dependencias, validación y estado.
- **Validation Finding**: error, conflicto o advertencia trazable a un recurso y campo de una revisión.
- **Change Set / Diff**: comparación revisable entre una Proposal Revision y su base canónica,
  incluidas altas, cambios, archivados, relaciones e impacto.
- **Approval Decision**: decisión explícita de aprobar o rechazar una revisión y fingerprint exactos,
  con usuario, workspace, permisos y fecha; no es texto de conversación y una aprobación solo puede
  consumirse una vez.
- **Cost Confirmation**: consentimiento adicional e inmutable para un alcance y estimación de gasto
  exactos, con cuota y vigencia, independiente de la aprobación editorial.
- **Application Receipt**: prueba inmutable del resultado transaccional o reconciliado, con las
  versiones canónicas afectadas y la clave que evita efectos duplicados.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Al menos el 90 % de personas creadoras de una prueba de usabilidad puede pasar de una
  idea inicial a una propuesta completa de serie y primer episodio lista para revisión sin ayuda
  externa ni navegación a formularios desconectados.
- **SC-002**: El 100 % de las solicitudes de mutación observadas en pruebas produce una propuesta
  estructurada y un diff visible antes de ofrecer aprobación; ninguna frase escrita en el chat
  modifica canon por sí sola.
- **SC-003**: El 100 % de las aplicaciones correctas crea todos los recursos incluidos o ninguno, y
  cada éxito cuenta con un recibo que permite relacionarlo con una revisión y fingerprint exactos.
- **SC-004**: El 100 % de las propuestas cuya base canónica cambió antes de aplicarse se rechaza como
  desactualizada, sin escrituras parciales ni reutilización de aprobaciones previas.
- **SC-005**: Repetir hasta diez veces la misma aprobación, aplicación o confirmación de coste produce
  un único resultado canónico y, cuando corresponde, como máximo un trabajo facturable.
- **SC-006**: En el 100 % de las pruebas de consulta de solo lectura, la persona obtiene una respuesta
  sin atravesar un flujo de aprobación y el canon permanece idéntico.
- **SC-007**: El 100 % de los trabajos generativos con coste ensayados, incluida toda inferencia real del
  copiloto, muestra estimación y alcance y obtiene confirmación económica válida antes de iniciarse;
  aprobar solo el contenido editorial no inicia gasto.
- **SC-008**: Una persona puede identificar contexto activo, estado actual y siguiente acción en
  menos de 10 segundos en cada estado principal y excepcional durante pruebas de usabilidad.
- **SC-009**: Tras recargar o retomar una conversación interrumpida, el 100 % de mensajes, revisiones,
  decisiones y resultados confirmados reaparece en orden correcto, sin presentar como aplicado un
  resultado incierto.
- **SC-010**: El recorrido de chat, revisión, aprobación y navegación al recurso aplicado se completa
  sin overflow horizontal en 375, 768, 1024, 1280 y 1440 px, y todas sus acciones esenciales son
  operables mediante teclado con foco visible.
- **SC-011**: En pruebas de aislamiento y roles, ningún usuario consulta, propone, aprueba o aplica
  cambios fuera de sus workspaces y permisos, incluidas instrucciones adversarias dentro del chat.
- **SC-012**: Las pruebas deterministas cubren el 100 % de las transiciones de estado declaradas y de
  los desenlaces aprobar, rechazar, descartar, desactualizar, fallar, reconciliar y aplicar, sin
  depender de servicios de pago.

## Dependencies

- **Feature 008 — Series + Series Bible**: fuente canónica para series, Bible, revisiones y límites.
- **Feature 009 — Characters, Locations & Props**: entidades creativas versionadas y sus referencias.
- **Feature 011 — Story State Engine**: snapshot narrativo, diff y continuidad canónica.
- **Feature 012 — Episode Planner**: planes estructurados, editables, comparables y aprobables.
- **Feature 013 — Scene & Shot Planner**: escenas y shots explícitos, ordenados y validados.
- **Feature 014 — Episode Generation Graph**: trabajos por shot, progreso y reutilización segura.
- **Feature 017 — Episode Studio**: superficie especializada de producción que esta feature enlaza y
  no duplica.
- **Feature 018 — Continuity & QA**: hallazgos estructurados y resolución trazable.
- **Feature 025 — Cost Observability & Operations**: estimación, atribución, presupuesto y estado de
  trabajos con coste.
- **Feature 026 — Accounts & Workspaces**: identidad, aislamiento, roles y cuotas.
- **Feature 027 — Studio UI Refresh**: shell, jerarquía, responsive y accesibilidad que la nueva
  portada debe preservar.

## Traceability

| Scope in Feature 029                             | Canonical capability reused  | Primary requirements                                | Measurable outcomes    |
| ------------------------------------------------ | ---------------------------- | --------------------------------------------------- | ---------------------- |
| Consultar y clasificar intenciones con seguridad | Features 008, 009, 011 y 026 | FR-005–FR-006, FR-025, FR-027–FR-028, FR-041–FR-046 | SC-002, SC-006, SC-011 |
| Crear serie y Series Bible                       | Feature 008                  | FR-008, FR-010–FR-022                               | SC-001–SC-003          |
| Crear personajes, localizaciones y props         | Feature 009                  | FR-008, FR-013–FR-022                               | SC-001–SC-003          |
| Validar continuidad y cambios narrativos         | Features 011 y 018           | FR-013–FR-015, FR-023, FR-025                       | SC-004, SC-012         |
| Crear plan, escenas, guion y trabajar con shots  | Features 012 y 013           | FR-007, FR-009, FR-024–FR-026, FR-048               | SC-001–SC-004, SC-012  |
| Iniciar producción generativa                    | Feature 014                  | FR-030, FR-035–FR-038, FR-047                       | SC-005, SC-007, SC-012 |
| Abrir el estudio especializado                   | Feature 017                  | FR-001, FR-024, FR-026                              | SC-010                 |
| Conservar continuidad e historial auditable      | Features 011 y 018           | FR-011, FR-022–FR-028                               | SC-004, SC-009, SC-012 |
| Mostrar y confirmar coste                        | Feature 025                  | FR-035–FR-038, FR-047                               | SC-005, SC-007         |
| Autorizar por workspace y rol                    | Feature 026                  | FR-002–FR-004, FR-039, FR-041–FR-047                | SC-011                 |
| Medir y confirmar inferencia conversacional      | Features 025 y 026           | FR-035–FR-036, FR-049                               | SC-007, SC-011         |
| Proteger comandos y limitar abuso                | Feature 026                  | FR-039, FR-045–FR-046, FR-050                       | SC-011, SC-012         |
| Coordinar propuestas mixtas                      | Features 014 y 025           | FR-010, FR-036–FR-038, FR-047, FR-051               | SC-005, SC-007         |
| Deduplicar mensajes y revisiones                 | Historial del copiloto       | FR-011, FR-021, FR-027, FR-052                      | SC-005, SC-009, SC-012 |
| Mantener UX coherente y adaptable                | Feature 027                  | FR-001, FR-029–FR-034                               | SC-008–SC-010          |
| Validar sin gasto accidental                     | Constitution + Feature 025   | FR-040                                              | SC-012                 |

## Assumptions

- La primera entrega se orienta a creadores con permiso de edición; viewers pueden consultar el
  contexto y el historial autorizado, pero no aprobar, aplicar ni confirmar gasto.
- El contexto global corresponde siempre al workspace activo; una propuesta nunca abarca más de un
  workspace ni mezcla recursos de dos series.
- «Guion estructurado» comprende acción, diálogo y continuidad asignados a escenas y unidades
  narrativas explícitas del modelo canónico existente; la especificación no crea un segundo modelo
  persistente de guion ni exige un editor de formato profesional independiente.
- Una advertencia no bloqueante puede aprobarse si queda visible y trazada; un error estructural, de
  permisos, relaciones o continuidad bloqueante debe resolverse antes de aprobar.
- La retención y eliminación de conversaciones sigue la política del workspace y las obligaciones de
  la cuenta; los recibos y decisiones que formen parte de la auditoría canónica conservan la
  retención exigida por el producto.
- Los trabajos generativos y la inferencia conversacional reutilizan las capacidades y límites de coste
  existentes; esta feature no crea un segundo sistema de cuotas ni presupone modalidades nuevas.
- El idioma inicial de la interfaz y las respuestas conserva la configuración existente del
  workspace o, si no existe, el idioma usado por la persona en la conversación.

## Out of Scope

- Reemplazar Series Workspace, Episode Studio, Operations o sus herramientas especializadas por una
  segunda implementación dentro del chat.
- Tratar el historial del modelo, una conversación o un borrador como fuente canónica de continuidad,
  permisos, costes o estado de producción.
- Aplicar cambios solo porque el usuario los confirme en lenguaje natural o permitir autoaprobación
  por parte del copiloto.
- Crear nuevos proveedores, modelos, pipelines multimedia, editores profesionales de guion o nuevas
  modalidades de generación.
- Producir automáticamente keyframes, vídeo, audio, composición o publicación como efecto implícito
  de crear una serie o episodio.
- Aprobar parcialmente un conjunto transaccional cuando sus dependencias requieran aplicarlo como una
  unidad; un futuro flujo de selección parcial deberá generar una nueva revisión y diff.
- Colaboración simultánea avanzada sobre el mismo texto, comentarios editoriales, sugerencias de
  terceros o resolución en tiempo real más allá de detectar revisiones desactualizadas.
- Automatización autónoma sin supervisión humana, ejecución programada o publicación desde el chat.
