# Feature Specification: Story State Engine

**Feature Branch**: `011-story-state-engine`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear Story State como fuente de verdad de continuidad narrativa."

## Clarifications

### Session 2026-09-04

- Q: ¿Modelado? → A: Snapshot versionado e inmutable por serie (`before`/`after`), con datos
  estructurados validados por Zod.
- Q: ¿Canon? → A: Un estado que contradice una regla de canon se marca (negación simple de hechos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estado versionado (Priority: P1)

Registrar estados before/after versionados; el histórico es inmutable y reconstruible.

### User Story 2 - Diff y canon (Priority: P1)

Inspeccionar el diff entre estados y señalar transiciones incompatibles con canon.

## Requirements *(mandatory)*

- **FR-001**: DEBE representarse el estado de personajes, relaciones, inventario, hechos, objetivos,
  secretos, preguntas, decisiones y consecuencias.
- **FR-002**: DEBE mantenerse histórico versionado e inmutable.
- **FR-003**: DEBE poder inspeccionarse un diff entre estados.
- **FR-004**: DEBE señalarse una transición claramente incompatible con canon.
- **FR-005**: El siguiente planner DEBE recibir un snapshot explícito y versionado.

### Key Entities

- **StoryState**: snapshot versionado de continuidad (before/after).

## Success Criteria

- **SC-001**: Se puede reconstruir la evolución sin leer los vídeos.
- **SC-002**: Un estado pasado es inmutable.

## Assumptions

- Serie y canon existen (Specs 008/009).
