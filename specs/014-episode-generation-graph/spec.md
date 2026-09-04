# Feature Specification: Episode Generation Graph

**Feature Branch**: `014-episode-generation-graph`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Construir el Generation Graph que convierte un shot list aprobado en
assets reales."

## Clarifications

### Session 2026-09-04

- Q: ¿Steps? → A: Por shot, steps `keyframe` (imagen) y `video`, cada uno como job independiente
  con prompt snapshot y reutilización de outputs válidos.
- Q: ¿Progreso? → A: `pending | running | needs-review | approved | failed`, derivado de los steps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar assets por shot (Priority: P1)

Cada shot genera su keyframe y vídeo como steps independientes y trazables.

### User Story 2 - Reutilización y aislamiento (Priority: P1)

Un fallo en un shot no regenera los demás; reintentar reutiliza outputs válidos.

## Requirements *(mandatory)*

- **FR-001**: DEBE resolverse las referencias aprobadas de cada shot.
- **FR-002**: DEBE crearse/obtenerse keyframe y vídeo por shot como jobs independientes.
- **FR-003**: DEBE guardarse snapshot de prompt por step.
- **FR-004**: DEBE reutilizarse outputs válidos al reintentar.
- **FR-005**: DEBE aislarse el fallo por shot (no regenerar los demás).
- **FR-006**: DEBE mostrarse progreso del episodio.

### Key Entities

- **GenerationStep**: step por shot (kind, estado, job, input/output, snapshot).

## Success Criteria

- **SC-001**: Serie → episodio → shots → al menos dos shots generados realmente.
- **SC-002**: Un fallo en el segundo shot no regenera el primero.

## Assumptions

- Shots (013), jobs (007) y fal (004/005) existen.
