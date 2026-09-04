# Feature Specification: Generation Jobs Worker

**Feature Branch**: `007-generation-jobs-worker`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Formalizar el sistema de jobs asíncronos que utilizará toda la
generación de la plataforma."

## Clarifications

### Session 2026-09-04

- Q: ¿Cómo se reclaman jobs? → A: `SELECT ... FOR UPDATE SKIP LOCKED` en una transacción; cada
  claim crea un `job_attempt`.
- Q: ¿Idempotencia? → A: `idempotency_key` única; re-submit con la misma key devuelve el job
  existente (no duplica el gasto).
- Q: ¿Reintentos? → A: `max_attempts` por job; errores recuperables reencolan; al agotarse queda
  `failed` con `needs_review`.
- Q: ¿Migración? → A: Los flows de imagen/vídeo (004/005) pasan a enqueue jobs; el worker ejecuta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jobs persistentes con attempts y eventos (Priority: P1)

Un job persiste su estado, sus attempts y un timeline de eventos; reiniciar el worker no corrompe
el job.

### User Story 2 - Claiming seguro (Priority: P1)

Dos workers no procesan el mismo attempt simultáneamente.

### User Story 3 - Idempotencia y reintentos (Priority: P1)

Re-submit accidental no cobra dos veces; los errores recuperables reintentan de forma acotada.

### User Story 4 - UI de Generations con attempts (Priority: P2)

La UI muestra filtros por estado/tipo/modelo y el detalle de attempts/eventos.

## Requirements *(mandatory)*

- **FR-001**: DEBE persistir jobs y attempts con estados claros.
- **FR-002**: El claiming DEBE ser seguro (FOR UPDATE SKIP LOCKED).
- **FR-003**: DEBE existir idempotencia por `idempotency_key`.
- **FR-004**: DEBEN existir reintentos configurables con límite.
- **FR-005**: DEBE poder cancelarse un job cuando el estado lo permita.
- **FR-006**: DEBE existir timeline de eventos por job.
- **FR-007**: Los flows de imagen/vídeo DEBEN migrarse a este sistema.
- **FR-008**: La UI DEBE filtrar por estado/tipo/modelo y mostrar attempts.

### Key Entities

- **Job**: trabajo asíncrono persistente (estado, input, output, intentos, idempotency key).
- **JobAttempt**: un intento de ejecución (estado, provider request id, duración, error).
- **JobEvent**: evento del timeline.

## Success Criteria

- **SC-001**: Reiniciar el worker durante una generación no corrompe el job.
- **SC-002**: Dos workers no procesan el mismo attempt.
- **SC-003**: Re-submit con la misma key no duplica.
- **SC-004**: Se puede diagnosticar por qué falló una generación.

## Assumptions

- La cola se respalda en PostgreSQL (constitución IX).
