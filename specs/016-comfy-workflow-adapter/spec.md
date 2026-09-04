# Feature Specification: Comfy Workflow Adapter

**Feature Branch**: `016-comfy-workflow-adapter`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Añadir ComfyUI como motor opcional de workflows visuales avanzados,
manteniéndolo reemplazable."

## Clarifications

### Session 2026-09-04

- Q: ¿Ejecución live? → A: Adapter aislado tras un puerto tipado; ejecución live `UNAVAILABLE`
  (no hay servidor ComfyUI configurado).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar workflows (Priority: P1)

Registrar workflows con nombre, versión y parámetros expuestos.

### User Story 2 - Ejecutar y recoger outputs (Priority: P2)

Ejecutar un workflow, monitorizarlo y guardar outputs; si Comfy no está configurado, la plataforma
sigue funcionando con fal.

## Requirements *(mandatory)*

- **FR-001**: DEBE poder registrarse un workflow con nombre, versión y parámetros.
- **FR-002**: DEBE poder mapearse inputs de dominio a parámetros del workflow.
- **FR-003**: El adapter DEBE estar aislado (puerto tipado) y ser reemplazable.
- **FR-004**: Un workflow incompatible o servidor no disponible NO DEBE romper el resto.

### Key Entities

- **ComfyWorkflow**: workflow registrado (nombre, versión, parámetros).

## Success Criteria

- **SC-001**: Poder apagar la integración sin migrar entidades de dominio.
- **SC-002**: La plataforma sigue siendo funcional con fal.ai.

## Assumptions

- ComfyUI es opcional; no hay servidor configurado en este entorno.
