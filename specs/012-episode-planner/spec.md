# Feature Specification: Episode Planner

**Feature Branch**: `012-episode-planner`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear el Episode Planner que convierte Series Bible + StoryStateBefore
+ decisión de audiencia opcional en un plan de episodio estructurado y editable."

## Clarifications

### Session 2026-09-04

- Q: ¿Generación? → A: Prompt `episode.plan` (AI SDK + OpenAI) con salida estructurada validada.
- Q: ¿Versionado? → A: Editar crea una nueva versión; aprobar marca una versión como base de
  producción; comparar versiones muestra el diff.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar plan con IA (Priority: P1)

Con Series Bible + StoryStateBefore (+ decisión opcional), el creador genera un plan estructurado
con prompt editable e inspeccionable.

### User Story 2 - Editar, aprobar y comparar (Priority: P1)

El plan es editable; se aprueba una versión concreta y se comparan versiones.

## Requirements *(mandatory)*

- **FR-001**: El plan DEBE incluir hook, objetivo dramático, beats, duración, entidades implicadas,
  información revelada, continuidad, cierre/cliffhanger, pregunta de audiencia y StoryStateAfter propuesto.
- **FR-002**: DEBE generarse con IA (prompt versionado) y validarse estructuralmente.
- **FR-003**: DEBE ser editable sin destruir versiones anteriores.
- **FR-004**: DEBE poder aprobarse una versión como base de producción.
- **FR-005**: DEBE poder compararse versiones.
- **FR-006**: Un plan inválido o contradictorio NO DEBE aprobarse silenciosamente.

### Key Entities

- **EpisodePlan**: plan estructurado versionado con estado (draft/approved).

## Success Criteria

- **SC-001**: Outputs estructurados y validados.
- **SC-002**: Cada propuesta conserva trazabilidad a prompt/modelo.

## Assumptions

- Series Bible (008) y Story State (011) existen.
