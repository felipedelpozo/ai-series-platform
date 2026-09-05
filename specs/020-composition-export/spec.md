# Feature Specification: Composition & Export

**Feature Branch**: `020-composition-export`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear composición y exportación del episodio terminado a un archivo
vertical listo para TikTok."

## Clarifications

### Session 2026-09-04

- Q: ¿Composición? → A: ffmpeg; ordenar clips aprobados, escalar/pad a 9:16, combinar audio y
  exportar MP4 con preset de calidad; el resultado es un asset derivado con lineage.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exportar el episodio (Priority: P1)

Componer clips aprobados + audio en un único MP4 9:16 reproducible.

### User Story 2 - Reexportar sin regenerar (Priority: P2)

Reexportar no regenera los assets fuente.

## Requirements *(mandatory)*

- **FR-001**: DEBE ordenarse los clips aprobados según el shot list.
- **FR-002**: DEBE combinarse vídeo + audio.
- **FR-003**: DEBE exportarse 9:16 con preset de calidad.
- **FR-004**: El export DEBE guardarse como asset derivado con lineage.
- **FR-005**: Reexportar NO DEBE regenerar assets fuente.

### Key Entities

- **EpisodeExport**: export con estado y asset derivado.

## Success Criteria

- **SC-001**: Varios clips + audio se exportan a un único MP4 reproducible.

## Assumptions

- ffmpeg disponible (FFMPEG_PATH).
