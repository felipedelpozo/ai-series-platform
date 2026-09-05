# Feature Specification: Reference Sheet Generation

**Feature Branch**: `010-reference-sheet-generation`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Generar reference sheets REALES para personajes, localizaciones y
props usando el sistema de prompts y generación ya construido."

## Clarifications

### Session 2026-09-04

- Q: ¿Flujo? → A: Renderizar `reference.sheet` con variables de la entidad + Bible, encolar un job
  de imagen real (fal) y vincular el resultado a la versión exacta de la entidad.
- Q: ¿Estados? → A: `draft | approved | rejected`; aprobar puede promover la imagen a referencia
  oficial de la entidad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar una reference sheet real (Priority: P1)

Desde una entidad, el creador genera una imagen real con la plantilla `reference.sheet`, con
variables resueltas y panels configurables.

### User Story 2 - Aprobar/rechazar/promover (Priority: P2)

El creador aprueba, rechaza o promueve una sheet a referencia oficial de la entidad.

## Requirements *(mandatory)*

- **FR-001**: DEBE poder generarse una reference sheet real (fal) para una entidad.
- **FR-002**: Las variables DEBEN resolverse desde la entidad y la Series Bible.
- **FR-003**: La sheet DEBE vincularse a la versión exacta de la entidad.
- **FR-004**: DEBE guardarse lineage (prompt snapshot, generación, asset).
- **FR-005**: DEBE poderse aprobar/rechazar y promover la imagen a referencia.

### Key Entities

- **ReferenceSheet**: sheet vinculada a entidad+versión, con job, estado y panels.

## Success Criteria

- **SC-001**: Serie → personaje → reference sheet real end-to-end.
- **SC-002**: La referencia aprobada puede seleccionarse como input posterior.

## Assumptions

- Entidades (Spec 009) y Prompt Registry (Spec 003) existen; fal con saldo.
