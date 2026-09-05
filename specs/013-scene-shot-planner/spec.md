# Feature Specification: Scene & Shot Planner

**Feature Branch**: `013-scene-shot-planner`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Transformar un Episode Plan aprobado en escenas y shots
cinematográficos explícitos."

## Clarifications

### Session 2026-09-04

- Q: ¿Generación? → A: Una llamada IA con `scene.plan` que devuelve escenas con sus shots anidados.
- Q: ¿Estado? → A: `draft | approved | locked`; reordenar shots es una operación explícita.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar escenas y shots (Priority: P1)

Desde un plan aprobado, la IA genera escenas y shots cinematográficos estructurados.

### User Story 2 - Editar y reordenar (Priority: P1)

Todo es editable; se puede reordenar shots y bloquear campos.

## Requirements *(mandatory)*

- **FR-001**: DEBE transformarse un plan aprobado en escenas y shots explícitos.
- **FR-002**: Cada escena DEBE tener propósito, localización, personajes/props, acción, diálogo,
  duración y continuidad.
- **FR-003**: Cada shot DEBE tener tipo de plano, sujeto, acción, composición, cámara, lente,
  iluminación, emoción, referencias, prompts de imagen/vídeo y restricciones de continuidad.
- **FR-004**: DEBE poder reordenarse shots y calcularse la duración total aproximada.
- **FR-005**: DEBE poder bloquearse campos que no cambian al regenerar.

### Key Entities

- **Scene**: unidad narrativa con shots.
- **Shot**: unidad cinematográfica con estado.

## Success Criteria

- **SC-001**: Un episodio aprobado produce un shot list listo para generación.
- **SC-002**: No se requiere interpretar prosa libre para saber qué generar.

## Assumptions

- Episode Planner (012) existe y hay un plan aprobado.
