# Feature Specification: Continuity & QA

**Feature Branch**: `018-continuity-and-qa`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Añadir un pipeline de QA que detecte problemas antes de aprobar un
episodio."

## Clarifications

### Session 2026-09-04

- Q: ¿Checks? → A: Deterministas (output vacío/corrupto, shot duplicado, cliffhanger ausente,
  duración fuera de objetivo) + IA (narrative/visual/continuity con prompts editables).
- Q: ¿Resolución? → A: `open | accepted | ignored | repaired`, con motivo para ignored.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Checks deterministas (Priority: P1)

Un episodio con inconsistencia es marcado con findings deterministas.

### User Story 2 - Findings IA (Priority: P2)

QA narrativa/visual/continuidad usa prompts editables y outputs estructurados.

### User Story 3 - Resolver findings (Priority: P2)

Aceptar, ignorar (con motivo) o reparar; nunca se borran assets automáticamente.

## Requirements *(mandatory)*

- **FR-001**: DEBE detectarse output vacío/corrupto y shot duplicado de forma determinista.
- **FR-002**: DEBE detectarse cliffhanger/pregunta ausente cuando se requiere.
- **FR-003**: DEBE detectarse duración fuera de objetivo.
- **FR-004**: La QA IA DEBE usar prompts editables y salida estructurada.
- **FR-005**: Los findings DEBEN poder aceptarse/ignorarse/repararse con historial.
- **FR-006**: Los findings NO DEBEN borrar assets.

### Key Entities

- **QaFinding**: finding con severidad, evidencia, target, reparación y estado.

## Success Criteria

- **SC-001**: Un episodio con inconsistencia intencional es marcado.
- **SC-002**: Queda historial del finding y su resolución.

## Assumptions

- Planes/shots (012/013), Bible (008) y StoryState (011) existen.
