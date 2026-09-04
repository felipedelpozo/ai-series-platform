# Feature Specification: Media Asset Library

**Feature Branch**: `006-media-asset-library`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear una biblioteca de assets que sea la fuente de verdad para todo
el material generado o subido."

## Clarifications

### Session 2026-09-04

- Q: ¿Cómo se borra? → A: Borrado seguro: se rechaza si el asset tiene hijos o generaciones que lo
  referencian; en caso contrario se borra la fila y su fichero local.
- Q: ¿Relaciones? → A: `parentId` (self-reference para assets derivados) + `generationId` (origen).
- Q: ¿Estados? → A: `draft | approved | rejected | locked`; `locked` no puede re-transicionarse.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Listar, filtrar y abrir assets (Priority: P1)

El creador lista assets de imagen, vídeo y audio, los filtra por tipo/origen/estado y abre su detalle.

### User Story 2 - Estado y reutilización (Priority: P1)

El creador marca un asset como approved/rejected/locked y reutiliza su referencia interna como input.

### User Story 3 - Borrado seguro (Priority: P2)

El borrado respeta las relaciones existentes (hijos y generaciones).

## Requirements *(mandatory)*

- **FR-001**: DEBE poder listarse/filtrarse assets de imagen, vídeo y audio.
- **FR-002**: Cada asset DEBE registrar origen (generado/subido/derivado), parent y generación.
- **FR-003**: DEBE mostrarse metadata (mime, dimensiones, duración, tamaño, proveedor/modelo, timestamps).
- **FR-004**: DEBE poder marcarse un asset como draft/approved/rejected/locked.
- **FR-005**: El borrado DEBE ser seguro (rechazado si hay hijos o generaciones referenciadas).
- **FR-006**: La referencia interna DEBE ser estable aunque la URL temporal del proveedor cambie.

### Key Entities

- **Asset**: medio (imagen/vídeo/audio) con metadata, origen, parent, generación y estado.

## Success Criteria

- **SC-001**: Los outputs de 004/005 aparecen automáticamente en la biblioteca.
- **SC-002**: Un asset sobrevive a una recarga y puede reutilizarse como input.
- **SC-003**: Se puede rastrear el lineage hasta la generación y el snapshot.

## Assumptions

- El almacenamiento local es suficiente; la interfaz queda lista para migrar a object storage.
