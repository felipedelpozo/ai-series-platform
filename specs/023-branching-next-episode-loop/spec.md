# Feature Specification: Branching Next Episode Loop

**Feature Branch**: `023-branching-next-episode-loop`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Cerrar el loop central del producto: Audience Decision -> StoryState ->
siguiente episodio -> generación."

## Clarifications

### Session 2026-09-04

- Q: ¿Qué significa "rama alternativa"? → A: Una rama crea un siguiente episodio paralelo a partir
  de una decisión distinta, etiquetada con `branchId`, sin cambiar el StoryState canónico ni el
  plan activo canónico.
- Q: ¿La generación del plan requiere IA? → A: El borrador determinista siempre se crea; el plan
  enriquecido y las escenas usan IA cuando el proveedor está disponible.
- Q: ¿Cómo se preserva continuidad? → A: La transición se calcula deterministamente sobre el
  StoryState canónico vigente y se conserva canon/relaciones/referencias.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Aplicar decisión y crear el siguiente episodio (Priority: P1)

Aprobar una decisión, aplicar una transición explícita al StoryState y crear el borrador del
siguiente episodio manteniendo continuidad.

**Why this priority**: Es el acceptance test de negocio más importante del MVP.

**Independent Test**: Con una serie con episodio 1 y una decisión aprobada, aplicar la decisión y
verificar que se crea un borrador de episodio 2 y que el StoryState avanza de forma trazable.

**Acceptance Scenarios**:

1. **Given** episodio 1 finalizado y decisión aprobada, **When** se aplica la decisión, **Then** se
   crea el borrador de episodio 2 y el StoryState registra la transición.
2. **Given** una decisión no aprobada, **When** se intenta aplicar, **Then** se rechaza.

### User Story 2 - Plan, escenas y generation graph (Priority: P2)

Generar el plan, revisarlo, producir scenes/shots e iniciar el generation graph.

**Why this priority**: Convierte el borrador en producción ejecutable.

**Independent Test**: Generar plan y escenas, e iniciar jobs de keyframe/vídeo para los shots.

**Acceptance Scenarios**:

1. **Given** un borrador de episodio, **When** se genera el plan y las escenas, **Then** existen
   scenes/shots y se pueden encolar jobs.

### User Story 3 - Rama alternativa sin sobrescribir la canónica (Priority: P3)

Crear una rama alternativa desde una decisión distinta sin alterar la línea canónica.

**Why this priority**: Habilita experimentación narrativa sin perder el tronco principal.

**Independent Test**: Crear una rama y aplicar una decisión en ella; verificar que el StoryState
canónico y el plan canónico activo permanecen intactos.

**Acceptance Scenarios**:

1. **Given** una rama alternativa, **When** se aplica una decisión en ella, **Then** el episodio de
   la rama se crea y la canónica no se sobrescribe.

## Requirements *(mandatory)*

- **FR-001**: DEBE tomar una decisión aprobada y aplicarla como transición explícita del StoryState.
- **FR-002**: DEBE crear el siguiente Episode Draft.
- **FR-003**: DEBE generar su plan y permitir revisión.
- **FR-004**: DEBE producir scenes/shots.
- **FR-005**: DEBE iniciar el generation graph.
- **FR-006**: DEBE preservar continuidad y referencias.
- **FR-007**: DEBE mantener una línea temporal de decisiones por episodio.
- **FR-008**: DEBE permitir crear una rama alternativa sin sobrescribir la canónica.
- **FR-009**: DEBE rechazar decisiones no aprobadas.

### Key Entities

- **Branch**: rama narrativa (canónica o alternativa) con episodio base.
- **EpisodeLoop**: vínculo decisión aprobada → transición de StoryState → plan del siguiente
  episodio, con su estado y timeline.

## Success Criteria

- **SC-001**: Desde episodio 1 finalizado y señales importadas, aprobar una decisión lleva a un
  episodio 2 generado manteniendo personaje, mundo y continuidad.
- **SC-002**: La decisión aplicada queda trazable al StoryState y al plan.
- **SC-003**: Una rama alternativa no sobrescribe la canónica.

## Assumptions

- El StoryState canónico es la última versión `isCurrent` de la serie.
- La generación con IA usa los prompts `episode.plan`/`scene.plan` existentes.
- La rama alternativa no muta el StoryState global; su estado propuesto queda en el loop.
