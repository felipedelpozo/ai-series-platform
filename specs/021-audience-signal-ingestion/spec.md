# Feature Specification: Audience Signal Ingestion

**Feature Branch**: `021-audience-signal-ingestion`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear la capa de señales de audiencia sin depender todavía de
publicación automática."

## Clarifications

### Session 2026-09-04

- Q: ¿Dedupe/spam? → A: Dedupe por `platform + sourceId`; spam detectado por heurística (vacío,
  enlaces, repetición); raw separado de la interpretación.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importar señales (Priority: P1)

Importar comentarios/reacciones normalizados, deduplicados y con detección de spam.

### User Story 2 - Ventana de decisión (Priority: P2)

Abrir/cerrar una ventana de interacción y ver volumen/distribución.

## Requirements *(mandatory)*

- **FR-001**: DEBE normalizarse comentarios, likes/reacciones, replies y metadata.
- **FR-002**: DEBE deduplicarse por fuente.
- **FR-003**: DEBE detectarse spam/entradas inválidas.
- **FR-004**: DEBE conservarse el raw source separado de la interpretación.
- **FR-005**: DEBE asociarse señales a serie/episodio/ventana.
- **FR-006**: DEBE abrirse/cerrarse una ventana de decisión.

### Key Entities

- **AudienceSignal**: señal normalizada (raw + interpretación).
- **InteractionWindow**: ventana abierta/cerrada.

## Success Criteria

- **SC-001**: Un episodio recibe un dataset realista sin TikTok API.
- **SC-002**: La información queda lista para el Decision Engine sin perder el original.

## Assumptions

- No hay publicación automática (Spec 024).
