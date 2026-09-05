# Feature Specification: Characters, Locations & Props

**Feature Branch**: `009-characters-locations-props`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Añadir el Asset Bible estructurado: personajes, localizaciones y props
narrativos vinculados a una serie."

## Clarifications

### Session 2026-09-04

- Q: ¿Modelado? → A: Entidad versionada por tipo (`character`/`location`/`prop`) con datos
  tipados por Zod en un campo `data` JSONB (campos específicos de tipo).
- Q: ¿IA? → A: Propuestas textuales con prompts `character.reference`/`location.reference`/
  `prop.reference`, editables y aprobables.
- Q: ¿Referencias? → A: `reference_assets` vincula assets aprobados/bloqueados a una entidad.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entidades versionadas (Priority: P1)

El creador define personajes, localizaciones y props versionados vinculados a una serie.

### User Story 2 - Propuestas IA editables (Priority: P2)

Generar una propuesta textual con IA, editable y aprobable.

### User Story 3 - Referencias a assets (Priority: P2)

Adjuntar assets existentes como referencia aprobada/bloqueada.

## Requirements *(mandatory)*

- **FR-001**: DEBE poder crearse/editerse personajes, localizaciones y props vinculados a una serie.
- **FR-002**: Las entidades DEBEN ser versionadas (editar crea nueva versión).
- **FR-003**: DEBE poderse generar una propuesta IA editable con prompt versionado.
- **FR-004**: DEBEN poder adjuntarse assets como referencia (approved/locked).
- **FR-005**: Cambiar una versión futura NO DEBE reescribir el contexto de versiones pasadas.

### Key Entities

- **Entity** (character/location/prop): cabeza versionada con datos tipados.
- **EntityVersion**: revisión versionada con `data` (Zod-validado), origen y snapshot.
- **ReferenceAsset**: vínculo entity ↔ asset con estado.

## Success Criteria

- **SC-001**: Una serie puede definir y consultar su bible de referencias completa.
- **SC-002**: Cada entidad sabe qué versión está activa y qué assets la representan.

## Assumptions

- Serie y Bible existen (Spec 008).
