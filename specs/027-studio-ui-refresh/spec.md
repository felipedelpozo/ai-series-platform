# Feature Specification: Studio UI Refresh

**Feature Branch**: `feature/027-studio-ui-refresh`

**Created**: 2026-09-05

**Status**: Implemented

**Input**: User description: "Improve UI/UX with shadcn/ui and shadcn Blocks across the existing
application while preserving functionality, business architecture, data contracts, and primary
flows."

## Clarifications

### Session 2026-09-05

- Q: ¿Cuál es el alcance de pantallas? → A: Todas las rutas de estudio existentes, priorizando el
  shell global y las pantallas principales de series, assets, prompts, generations, operations,
  accounts, settings y episode studio.
- Q: ¿Qué puede cambiar además del aspecto? → A: Se puede mejorar jerarquía, agrupación, copy de
  interfaz y comportamiento responsive, pero no acciones, permisos, contratos, persistencia ni
  lógica de negocio.
- Q: ¿Qué dirección visual debe gobernar el rediseño? → A: Una mesa de montaje editorial sobria,
  con el estado de producción como información dominante y una línea de continuidad como gesto
  visual distintivo.
- Q: ¿Qué hacer si la revisión del rediseño descubre que el bloqueo visual no evita trabajos
  pagados duplicados entre pestañas o reintentos de red? → A: Aplicar el hardening mínimo y
  compatible en el boundary de jobs: claves por intento, deduplicación atómica de trabajos activos
  y regresiones concurrentes, sin cambiar rutas, esquema ni capacidades de producto.
- Q: ¿Cómo se demuestra compatibilidad completa sin convertir el rediseño en 46 pruebas E2E
  duplicadas y frágiles? → A: Por capas: guard runtime y matriz ejecutable para el 100 % de métodos,
  rutas y payloads; suite backend existente para conservar resultados de dominio/API; y E2E
  representativos para cada familia de interacción, estado y riesgo. La disponibilidad de estados en
  superficies anidadas se comprueba exhaustivamente por contrato de source y por navegador en cada
  familia de pantalla principal.
- Q: ¿Cómo se corrige la dirección visual del launcher tras rechazar la propuesta editorial? → A:
  Volver a la base neutral nativa de shadcn, usar Geist como única tipografía de interfaz, mantener
  temas claro y oscuro equivalentes y reorganizar `/series` como launcher compacto en grid sobre un
  detalle de ancho completo. El único rail muestra hechos canónicos de setup —Bible activa,
  entidades existentes y planes activos— sin inferir una secuencia de dominio ni un estado de
  producción nuevo.
- Q: ¿Debe incorporarse beUI para animar el launcher? → A: No. El rail factual se resuelve con CSS
  y respeta `prefers-reduced-motion`; añadir Motion/beUI para un único gesto no aporta suficiente
  valor y aumentaría el JavaScript cliente y la superficie de mantenimiento.
- Q: ¿Qué ocurre con los inputs recientes para orientar la generación? → A: Se preservan y se
  validan de extremo a extremo los detalles opcionales de Bible, Entity y Episode Plan, con máximo
  4.000 caracteres, payload compatible, bloqueo síncrono de duplicados y retención tras error.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Orientarse y actuar en el estudio (Priority: P1)

Una persona creadora u operadora entra en cualquier pantalla del estudio y reconoce de inmediato
dónde está, cuál es la acción principal del contexto y cómo llegar al resto de áreas.

**Why this priority**: El shell, la navegación y la jerarquía compartida determinan la claridad de
todas las tareas posteriores.

**Independent Test**: Recorrer todas las rutas principales con teclado y ratón en escritorio y
móvil, confirmando localización, navegación, acción primaria y retorno sin perder ninguna acción
existente.

**Acceptance Scenarios**:

1. **Given** cualquier ruta principal, **When** la persona observa la cabecera y navegación,
   **Then** identifica la sección activa, el propósito de la página y la acción dominante.
2. **Given** un viewport móvil de 375 px, **When** abre la navegación, **Then** accede a todas las
   secciones sin que la barra lateral ocupe permanentemente el contenido ni exista overflow
   horizontal.
3. **Given** navegación solo con teclado, **When** recorre enlaces y controles, **Then** el foco es
   visible, el orden es lógico y todos los controles operables conservan un nombre accesible.

---

### User Story 2 - Comprender y controlar el trabajo de producción (Priority: P2)

La persona distingue contenido, estados y acciones en series, assets, prompts, generaciones,
operaciones, cuentas, settings y episode studio sin tener que interpretar paneles genéricos.

**Why this priority**: La plataforma concentra decisiones costosas y estados asíncronos; mostrarlos
con igual peso aumenta errores y hace difícil saber qué requiere atención.

**Independent Test**: Abrir cada pantalla con datos, sin datos y con error controlado, y verificar
que contenido principal, metadatos, acciones secundarias y siguiente paso se distinguen sin cambiar
el resultado de ninguna operación.

**Acceptance Scenarios**:

1. **Given** una colección con elementos, **When** la persona revisa o selecciona uno, **Then** la
   relación lista-detalle y sus estados son inequívocos y las acciones existentes siguen disponibles.
2. **Given** una colección vacía, **When** se renderiza la pantalla, **Then** explica qué falta y
   ofrece la siguiente acción real cuando existe.
3. **Given** una petición en curso o fallida, **When** la interfaz cambia de estado, **Then** muestra
   feedback localizado, evita acciones duplicadas mientras corresponde y ofrece recuperación
   cuando la operación es reintentable.
4. **Given** una acción destructiva real, **When** la persona la inicia, **Then** se diferencia
   visualmente y requiere confirmación antes de una pérdida irreversible.

---

### User Story 3 - Trabajar con precisión en cualquier tamaño (Priority: P3)

La persona usa los flujos principales en móvil, tableta y escritorio con densidad, legibilidad y
controles adecuados a cada tamaño.

**Why this priority**: El estudio es desktop-first, pero hoy varios layouts conservan anchos fijos
que hacen las rutas inutilizables en móvil y estrechas en tableta.

**Independent Test**: Revisar visualmente y operar las rutas en 375, 768, 1024, 1280 y 1440 px,
incluidos listas, paneles de detalle, filtros, formularios, navegación y el inspector del episodio.

**Acceptance Scenarios**:

1. **Given** cualquiera de los tamaños objetivo, **When** se carga una ruta principal, **Then** no
   aparece overflow horizontal en la página y el contenido prioritario permanece visible.
2. **Given** una pantalla estrecha, **When** una vista lista-detalle o de tres paneles no cabe,
   **Then** se apila o transforma en navegación/panel contextual manteniendo todas las acciones.
3. **Given** preferencias de movimiento reducido o tema claro/oscuro, **When** se utiliza el estudio,
   **Then** las transiciones respetan la preferencia y el contraste/jerarquía se mantienen.

### Edge Cases

- Una ruta no dispone todavía de datos o solo implementa un estado de configuración futuro.
- Una respuesta de red falla, devuelve contenido inesperado o tarda mientras la persona cambia de
  pantalla; la respuesta tardía no sobrescribe el contexto visible ni produce feedback en una
  pantalla ya abandonada.
- Etiquetas, IDs, errores o nombres son excepcionalmente largos.
- Una colección contiene suficientes elementos para exigir scroll sin desplazar la cabecera ni las
  acciones contextuales esenciales.
- La preferencia de tema guardada contradice la preferencia del sistema; prevalece la elección
  guardada hasta que la persona la cambie explícitamente.
- Un asset no tiene miniatura compatible o sus dimensiones/metadatos son desconocidos.
- Episode Studio no tiene escenas, no tiene shot seleccionado o solo dispone de uno de sus previews;
  cada caso orienta por separado sin presentar como error un preview parcial válido.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El estudio DEBE presentar un shell coherente con navegación adaptable, sección activa,
  cabecera contextual y un ancho/espaciado de contenido consistente.
- **FR-002**: Cada pantalla DEBE expresar un objetivo principal, una única acción dominante cuando
  exista y una jerarquía menor para acciones secundarias y metadatos.
- **FR-003**: La interfaz DEBE conservar todas las rutas, acciones, permisos, resultados, contratos
  y flujos principales existentes.
- **FR-004**: Los patrones repetidos de botón, campo, etiqueta, selección, panel, tabla/lista,
  estado, navegación y feedback DEBEN reutilizar el sistema de componentes compartido antes de
  introducir variantes locales.
- **FR-005**: Las pantallas de colecciones DEBEN incluir estados explícitos de carga, vacío y error,
  además del estado con datos.
- **FR-006**: Las acciones asíncronas DEBEN comunicar progreso, impedir duplicados mientras estén en
  curso cuando corresponda y mostrar error recuperable sin borrar la entrada del usuario.
- **FR-007**: Las acciones destructivas DEBEN diferenciarse de las neutrales y solicitar confirmación
  cuando impliquen pérdida real.
- **FR-008**: Los formularios DEBEN usar labels visibles, ayuda contextual cuando sea necesaria,
  validación próxima al campo, estados disabled/loading y feedback posterior a la acción.
- **FR-009**: Series DEBE ofrecer una relación lista-detalle clara y organizar Bible, Entities,
  Story State, Plans, Decisions, Loops y TikTok como secciones progresivas del mismo contexto.
- **FR-010**: Assets DEBE adaptar la colección y el detalle a pantallas estrechas, mantener filtros y
  diferenciar preview, metadatos y acciones de estado.
- **FR-011**: Prompts y Generations DEBEN presentar filtros, items y edición/laboratorio con jerarquía
  consistente y estados comprensibles.
- **FR-012**: Operations DEBE priorizar salud, presupuesto y fallos accionables sobre información
  secundaria, sin ocultar coste, latencia, reintentos, errores ni trazabilidad.
- **FR-013**: Accounts y Settings DEBEN distinguir autenticación/configuración, identidad actual,
  workspaces y próximos pasos sin inventar funcionalidad no existente.
- **FR-014**: Episode Studio DEBE mantener escenas/shots, preview, inspector, QA y exportación
  utilizables en escritorio y accesibles mediante una disposición adaptada en tamaños menores.
- **FR-015**: Todos los controles interactivos DEBEN tener semántica, nombre accesible, foco visible,
  orden de teclado lógico y superficie táctil suficiente.
- **FR-016**: Todo texto, control, foco y estado semántico propio de la interfaz DEBE mantener
  contraste WCAG AA en tema claro y oscuro; solo queda excluido el contenido visual interno de
  assets aportados o generados, y las transiciones DEBEN respetar movimiento reducido.
- **FR-017**: La aplicación DEBE evitar overflow horizontal de página en 375, 768, 1024, 1280 y
  1440 px; los datos largos DEBEN truncarse, envolver o desplazarse dentro de su región controlada.
- **FR-018**: La dirección visual DEBE ser sobria, neutral y reconociblemente nativa de shadcn; un
  rail solo DEBE aparecer cuando muestre hechos reales y explícitamente nombrados, sin presentar
  una secuencia opcional como workflow canónico.
- **FR-019**: Iconografía, radios, color, tipografía, espacios y elevación DEBEN derivarse de tokens
  semánticos compartidos y mantenerse consistentes entre pantallas.
- **FR-020**: Los cambios DEBEN incluir evidencia automatizada y visual suficiente para demostrar
  que no se ha eliminado funcionalidad, que los tamaños objetivo son utilizables y que las rutas
  principales siguen renderizando.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100 % de las rutas principales muestran sección activa, propósito de página y una
  jerarquía clara de acciones en escritorio y móvil.
- **SC-002**: Las rutas principales no presentan overflow horizontal de página en ninguno de los
  cinco tamaños objetivo: 375, 768, 1024, 1280 y 1440 px.
- **SC-003**: El 100 % de las acciones y enlaces existentes antes del rediseño siguen disponibles y
  producen solicitudes compatibles después del cambio, demostrado mediante una matriz ejecutable
  por ruta, acción, método, destino y campos; los resultados de negocio se preservan mediante las
  suites backend existentes y E2E representativos por familia de interacción.
- **SC-004**: El 100 % de las pantallas de datos principales ofrecen estados de carga, vacío y error
  que mantienen la estructura visual y orientan el siguiente paso.
- **SC-005**: Todas las tareas principales pueden completarse mediante teclado con foco visible y
  sin bloqueos de navegación.
- **SC-006**: Texto normal, texto grande, controles y estados semánticos alcanzan contraste AA en
  temas claro y oscuro, salvo contenido multimedia ajeno a la interfaz.
- **SC-007**: Todas las validaciones automatizadas existentes, comprobaciones de tipos, lint y build
  finalizan sin regresiones atribuibles al rediseño.
- **SC-008**: La revisión visual cubre todas las rutas principales en al menos un tamaño de escritorio
  y las rutas de Series, Assets y Episode Studio en móvil/tableta, con evidencia de los cinco anchos.

## Assumptions

- El estudio está orientado principalmente a creadores y operadores técnicos; escritorio conserva
  la mayor densidad y móvil prioriza revisión y acciones esenciales.
- El idioma actual de la interfaz se conserva en inglés para no introducir una feature de
  localización dentro de este rediseño.
- No se crean nuevas entidades, migraciones, endpoints ni capacidades de negocio.
- Los datos reales y la autorización existentes siguen siendo la única fuente de verdad; la UI no
  incorpora contenido de demostración.
- Los componentes y Blocks oficiales del sistema visual actual se adaptan a la arquitectura y datos
  reales; se eliminan dependencias o copy de demostración.
- La preferencia de tema existente se conserva y se amplía mediante tokens semánticos compatibles.
- `/series` es el launcher equivalente porque la ruta raíz redirige allí; no se crea una portada
  paralela ni se duplican fuentes de verdad.

## Out of Scope

- Cambios en modelos de datos, migraciones o capacidades de jobs/generaciones; se permite el
  hardening compatible de idempotencia acordado en Clarifications.
- Nuevos roles, permisos, autenticación o selección global de workspace.
- Nuevas acciones de producción, analítica, billing o capacidades de IA.
- Sustituir el sistema de componentes existente por otra biblioteca.
- Internacionalización completa o traducción de la aplicación.
