# Feature Specification: Episode Studio

**Feature Branch**: `017-episode-studio`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear el Episode Studio principal para revisar y dirigir la
producción de un episodio."

## Clarifications

### Session 2026-09-04

- Q: ¿Layout? → A: Árbol de escenas/shots a la izquierda, canvas de preview central e inspector
  derecho (editar prompts del shot, modelo/parámetros, regenerar, aprobar/rechazar/bloquear).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegar y previsualizar (Priority: P1)

Seleccionar escena/shot, ver assets y editar campos del shot.

### User Story 2 - Dirigir la producción (Priority: P1)

Editar los prompts de cada etapa, regenerar una etapa concreta y aprobar/rechazar/bloquear outputs.

## Requirements *(mandatory)*

- **FR-001**: DEBE mostrarse un árbol de escenas y shots.
- **FR-002**: DEBE haber un canvas de preview central.
- **FR-003**: DEBE haber un inspector para editar campos y prompts del shot.
- **FR-004**: DEBE poder regenerarse una etapa concreta (keyframe/vídeo).
- **FR-005**: DEBE poderse aprobar/rechazar/bloquear outputs.
- **FR-006**: DEBE verse el lineage y el estado global del episodio.

### Key Entities

- (Reutiliza Scene/Shot/GenerationStep de 013/014.)

## Success Criteria

- **SC-001**: El creador puede corregir un shot cambiando su prompt y regenerándolo desde el Studio.

## Assumptions

- Scenes/shots (013) y generation graph (014) existen.
