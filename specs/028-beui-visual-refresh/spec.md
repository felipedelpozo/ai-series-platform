# Feature Specification: BeUI Visual Refresh

**Feature Branch**: `feature/028-beui-visual-refresh`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "Adopt BeUI as the visual reference for the AI Series Platform,
selectively reuse eligible free/MIT patterns when viable, and remove the rejected aesthetic
customization layered over the existing interface without changing product behavior."

## Clarifications

### Session 2026-09-05

- Q: ¿Qué parte de BeUI puede orientar el rediseño? → A: Únicamente los patrones visuales y
  componentes de su catálogo gratuito cuya licencia MIT y procedencia puedan verificarse durante la
  planificación; los ejemplos de pago, de licencia incierta o incompatibles quedan excluidos.
- Q: ¿Debe sustituirse el sistema de interfaz existente? → A: No. La referencia se adapta de forma
  selectiva dentro del sistema compartido existente, sin añadir un segundo sistema de componentes ni
  alterar su comportamiento accesible.
- Q: ¿Qué significa retirar la capa de personalización actual? → A: Eliminar o reducir los tokens,
  variantes, wrappers y adornos puramente estéticos que producen la apariencia rechazada, conservando
  la semántica visual necesaria para jerarquía, estado, contraste, foco, tema oscuro y responsive.
- Q: ¿Cuál es la línea base funcional? → A: Feature 027 integrada más su follow-up validado: todas
  sus rutas, 46 acciones inventariadas, permisos, payloads, estados, flujos, correcciones y evidencias
  de compatibilidad deben permanecer válidos; esta feature sólo cambia el lenguaje visual.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reconocer un estudio claro y coherente (Priority: P1)

Una persona creadora u operadora entra en cualquier área principal y encuentra un lenguaje visual
consistente, limpio y reconocible, inspirado de forma selectiva en BeUI y adecuado a una herramienta
de producción audiovisual.

**Why this priority**: La petición nace del rechazo de la apariencia actual; el valor principal es
que el cambio se perciba en todo el estudio y no como un retoque aislado.

**Independent Test**: Recorrer las rutas principales con datos reales o representativos y comparar
shell, navegación, cabeceras, tarjetas, formularios, listas, paneles, estados y acciones para confirmar
una misma jerarquía visual sin residuos de la estética rechazada.

**Acceptance Scenarios**:

1. **Given** cualquiera de las rutas principales, **When** la persona la abre, **Then** reconoce la
   misma familia visual en navegación, tipografía, superficies, controles, espacios y feedback.
2. **Given** dos pantallas de distinta familia funcional, **When** muestran el mismo tipo de control o
   estado, **Then** este conserva apariencia, jerarquía y significado coherentes.
3. **Given** una superficie que aún contiene personalización estética anterior, **When** se revisa el
   resultado final, **Then** esa personalización ha sido retirada o justificada por una necesidad
   semántica, accesible o funcional verificable.

---

### User Story 2 - Mantener intacto el trabajo de producción (Priority: P1)

La persona sigue creando, editando, generando, revisando y operando la plataforma exactamente con
las capacidades y permisos existentes, aunque la presentación visual haya cambiado.

**Why this priority**: El estudio controla operaciones costosas y estado canónico; una mejora visual
no puede degradar ni reinterpretar el comportamiento del producto.

**Independent Test**: Ejecutar la matriz heredada de rutas y las 46 acciones inventariadas antes del
cambio, comprobando que cada control sigue disponible para el mismo rol, conserva su entrada y
produce el mismo resultado observable en éxito, progreso, error y recuperación.

**Acceptance Scenarios**:

1. **Given** una de las 46 acciones existentes, **When** la ejecuta un rol autorizado, **Then** la
   acción conserva entrada, destino, resultado, feedback y protección contra duplicados.
2. **Given** un rol sin permiso para una acción, **When** abre la misma superficie, **Then** el cambio
   visual no amplía ni oculta incorrectamente sus capacidades.
3. **Given** contenido editable en series, prompts, formularios o inspectores, **When** una operación
   falla, **Then** la entrada se conserva y se ofrece recuperación sin pérdida silenciosa.
4. **Given** una acción destructiva o de coste externo, **When** se inicia, **Then** conserva sus
   confirmaciones, bloqueos y señales de riesgo existentes.

---

### User Story 3 - Comprender estados y próximos pasos (Priority: P2)

La persona distingue de inmediato qué contenido está disponible, qué operación está en curso, qué ha
fallado, qué está vacío y qué requiere una acción humana en todas las superficies de datos.

**Why this priority**: La claridad de estado evita errores y acciones duplicadas en flujos de
producción largos o costosos.

**Independent Test**: Presentar estados con datos, carga, vacío, error recuperable, disabled y
operación en curso en cada familia de pantalla, y comprobar que la estructura no salta ni deja a la
persona sin siguiente paso.

**Acceptance Scenarios**:

1. **Given** una pantalla en carga, vacía o con error, **When** se renderiza, **Then** mantiene el
   contexto, nombra el estado y muestra el siguiente paso real cuando existe.
2. **Given** una operación asíncrona en curso, **When** la persona intenta repetirla, **Then** recibe
   feedback y no se duplica la acción mientras el bloqueo sea aplicable.
3. **Given** un estado de éxito, aviso, bloqueo o error, **When** se muestra en tema claro u oscuro,
   **Then** su significado no depende sólo del color y se distingue con contraste suficiente.

---

### User Story 4 - Usar el estudio en cualquier tamaño y modalidad (Priority: P2)

La persona navega y completa las tareas principales con ratón, teclado o interacción táctil en móvil,
tableta y escritorio, con tema claro u oscuro y con movimiento reducido.

**Why this priority**: La nueva apariencia sólo es válida si conserva la cobertura responsive y de
accesibilidad ya demostrada por la interfaz integrada.

**Independent Test**: Recorrer las rutas principales a 375, 768, 1024, 1280 y 1440 px, en temas claro
y oscuro, y completar los journeys representativos únicamente con teclado y con movimiento reducido.

**Acceptance Scenarios**:

1. **Given** cualquiera de los cinco anchos objetivo, **When** se abre una ruta principal, **Then** no
   existe overflow horizontal de página y contenido, navegación y acciones prioritarias son usables.
2. **Given** navegación sólo con teclado, **When** se recorren todos los controles, **Then** el orden es
   lógico, el foco permanece visible y cada control tiene un nombre accesible.
3. **Given** tema oscuro o preferencia de movimiento reducido, **When** cambia el estado de la
   interfaz, **Then** la jerarquía, el contraste y la comprensión se mantienen sin movimiento
   innecesario.

### Edge Cases

- Una ruta sólo dispone de un estado vacío o de configuración futura y no debe inventar datos para
  parecerse a la referencia visual.
- Un nombre, identificador, prompt o error excepcionalmente largo debe envolver, truncarse o
  desplazarse dentro de su región sin provocar overflow de página.
- Una respuesta tarda mientras la persona cambia de ruta o selección; la respuesta tardía no debe
  sobrescribir el contexto visible ni mostrar feedback en una superficie abandonada.
- Un asset no tiene miniatura, tiene una relación de aspecto extrema o no puede previsualizarse; el
  fallback mantiene información y acciones accesibles.
- Una pantalla de tres paneles o lista-detalle no cabe en móvil; la adaptación conserva contenido,
  contexto y acciones sin duplicarlos.
- Un patrón de referencia depende de material de pago, licencia no verificable o interacción que no
  puede conservar la accesibilidad; debe descartarse y resolverse con el sistema existente.
- Retirar un estilo heredado elimina accidentalmente una señal semántica, un target táctil, un foco o
  el contraste; la validación debe detectarlo antes de considerar terminada la feature.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El estudio DEBE adoptar un lenguaje visual coherente inspirado selectivamente en los
  patrones elegibles del catálogo gratuito de BeUI.
- **FR-002**: El cambio DEBE abarcar el shell y todas las rutas principales cubiertas por Feature 027,
  incluidas series, assets, prompts, generations, operations, accounts, settings y episode studio.
- **FR-003**: La interfaz DEBE conservar el 100 % de las rutas, enlaces, 46 acciones inventariadas,
  entradas, resultados, permisos y flujos principales existentes.
- **FR-004**: Los patrones repetidos DEBEN resolverse mediante el sistema compartido existente antes
  de introducir una variante local.
- **FR-005**: La feature DEBE retirar o reducir la capa estética rechazada en tokens, variantes,
  wrappers y componentes locales, sin eliminar estilos que comuniquen significado o comportamiento.
- **FR-006**: Cada decisión de conservar una personalización estética previa DEBE estar vinculada a
  una necesidad funcional, responsive, accesible o de estado comprobable.
- **FR-007**: Sólo DEBEN reutilizarse directamente materiales de referencia con procedencia y licencia
  gratuita compatibles verificadas; el resto sólo puede orientar una adaptación visual original.
- **FR-008**: La interfaz NO DEBE introducir una segunda fuente de verdad para componentes, estados o
  navegación ni duplicar un patrón compartido con una implementación paralela.
- **FR-009**: Series DEBE conservar su relación lista-detalle y las secciones Bible, Entities, Story
  State, Plans, Decisions, Loops y TikTok, con sus entradas y acciones actuales.
- **FR-010**: Prompts DEBE conservar listado, filtros, creación, edición, preview, variables, versiones
  y acciones existentes sin perder contenido introducido tras un fallo.
- **FR-011**: Assets y Generations DEBEN conservar filtros, previews, metadatos, selección, lineage,
  estados, historial de intentos y acciones existentes.
- **FR-012**: Operations DEBE conservar salud, presupuesto, coste, latencia, reintentos, errores,
  trazabilidad y acciones operativas sin reducir la prioridad de los fallos accionables.
- **FR-013**: Accounts y Settings DEBEN conservar autenticación, identidad, workspaces, permisos y
  próximos pasos sin inventar capacidades no disponibles.
- **FR-014**: Episode Studio DEBE conservar escenas, shots, preview, inspector, QA, regeneración y
  exportación en todas sus disposiciones responsive.
- **FR-015**: Las pantallas de datos DEBEN conservar estados explícitos de carga, vacío, datos, error
  recuperable y operación en curso.
- **FR-016**: Las acciones asíncronas DEBEN comunicar progreso, impedir duplicados cuando corresponda
  y conservar la entrada de la persona ante errores recuperables.
- **FR-017**: Las acciones destructivas DEBEN diferenciarse visualmente y mantener confirmación antes
  de cualquier pérdida irreversible.
- **FR-018**: Todos los controles DEBEN mantener nombre accesible, semántica, labels visibles cuando
  correspondan, orden de teclado lógico, foco visible y superficie táctil suficiente.
- **FR-019**: Texto, controles, foco y estados semánticos DEBEN mantener contraste WCAG AA en temas
  claro y oscuro; el significado no DEBE depender únicamente del color.
- **FR-020**: La aplicación DEBE evitar overflow horizontal de página en 375, 768, 1024, 1280 y
  1440 px, incluidos contenido largo, listas, formularios y paneles.
- **FR-021**: Las transiciones y cambios de estado DEBEN respetar la preferencia de movimiento
  reducido y no bloquear ni retrasar las acciones principales.
- **FR-022**: La interfaz DEBE usar datos y estados reales; NO DEBE incorporar contenido de
  demostración, métricas inferidas ni pasos canónicos inexistentes para imitar la referencia.
- **FR-023**: La validación DEBE demostrar de forma automatizada y visual que el nuevo lenguaje se
  aplica a todas las rutas principales y no elimina comportamiento, accesibilidad ni responsive.
- **FR-024**: La revisión final independiente DEBE cerrar todos los hallazgos BLOCKER y HIGH antes de
  considerar la feature lista para entrega.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100 % de las rutas principales presentan el nuevo lenguaje visual en shell,
  navegación, cabecera, superficies, controles y feedback, sin residuos no justificados de la
  estética rechazada.
- **SC-002**: Las 46 acciones de la matriz heredada siguen disponibles para los mismos roles y
  completan el mismo resultado observable con entradas compatibles.
- **SC-003**: El 100 % de las pantallas de datos principales muestran y distinguen carga, vacío,
  datos, error recuperable y operación en curso cuando esos estados aplican.
- **SC-004**: Ninguna ruta principal presenta overflow horizontal de página en 375, 768, 1024, 1280
  o 1440 px.
- **SC-005**: El 100 % de las tareas principales representativas se completan sólo con teclado, con
  foco visible y sin controles sin nombre accesible.
- **SC-006**: Todo texto, control, foco y estado semántico propio de la interfaz alcanza contraste
  WCAG AA en tema claro y oscuro.
- **SC-007**: La revisión visual cubre todas las rutas principales en escritorio y Series, Assets,
  Prompts y Episode Studio en móvil o tableta, incluyendo al menos un estado no feliz por cada
  familia de pantalla.
- **SC-008**: El inventario final registra el 100 % de patrones tomados como referencia, su
  procedencia, elegibilidad y forma de adaptación, sin material de licencia incierta en el producto.
- **SC-009**: Todas las validaciones funcionales existentes y las pruebas añadidas para el rediseño
  terminan sin regresiones atribuibles al cambio.
- **SC-010**: La revisión independiente termina con 0 hallazgos BLOCKER y 0 hallazgos HIGH abiertos.

## Assumptions

- Feature 027 y su follow-up validado son la línea base funcional y visual desde la que se mide esta
  feature; mientras ese follow-up no forme parte de `develop`, la entrega permanece explícitamente
  apilada sobre él y no puede evaluarse como un cambio independiente contra una base anterior.
- El catálogo gratuito de BeUI sirve como referencia, no como obligación de copiar cada patrón.
- La elegibilidad exacta de cada fuente y patrón se documentará antes de reutilizar material.
- El estudio sigue siendo desktop-first, con revisión y acciones esenciales plenamente utilizables en
  móvil y tableta.
- El idioma actual de la interfaz se conserva; la localización completa no forma parte del alcance.
- La preferencia de tema existente y los estados semánticos compartidos continúan siendo autoridad.
- No se crean entidades, migraciones, endpoints, permisos, roles ni capacidades de producto.
- Las pruebas de proveedores externos que incurren en coste permanecen opt-in y no son necesarias
  para demostrar un cambio exclusivamente visual.

## Out of Scope

- Sustituir el sistema de interfaz existente o mantener dos sistemas de componentes en paralelo.
- Copiar ejemplos de pago, material con licencia incierta o contenido de demostración de BeUI.
- Cambiar contratos, persistencia, modelos de datos, autenticación, permisos o cuotas.
- Añadir acciones de producción, generación, analítica, billing o administración.
- Rediseñar la lógica de estado, deduplicación, reintentos o aprobación ya validada.
- Internacionalización completa, nuevas rutas o una portada paralela.
