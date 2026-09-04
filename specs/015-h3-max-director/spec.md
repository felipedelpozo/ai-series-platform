# Feature Specification: H3 Max Director

**Feature Branch**: `015-h3-max-director`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Añadir soporte específico para dirección continua con H3 Max Director
como capacidad avanzada de generación de vídeo, sin acoplar el dominio a su API."

## Clarifications

### Session 2026-09-04

- Q: ¿Alcance live? → A: Gestión de sesiones (estado, prompt version, configuración) + adapter
  realtime aislado; la conexión realtime live queda `UNAVAILABLE` (requiere proxy/server-proxy alpha).
- Q: ¿Acoplamiento? → A: El dominio no importa el SDK del proveedor; el adapter es reemplazable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sesión de dirección (Priority: P1)

El creador abre una sesión para un shot con prompt inicial, aspect ratio, resolución y memoria.

### User Story 2 - Cambios de prompt versionados (Priority: P1)

Cada cambio de prompt crea una versión trazable.

### User Story 3 - Estado y parada (Priority: P2)

La sesión tiene estados claros y puede detenerse; los errores de conexión son recuperables.

## Requirements *(mandatory)*

- **FR-001**: DEBE poder abrirse una sesión de dirección con configuración inicial.
- **FR-002**: Cada cambio de prompt DEBE incrementar `prompt_version` trazable.
- **FR-003**: La sesión DEBE tener estados (idle/streaming/stopped/error) y poder detenerse.
- **FR-004**: El adapter realtime DEBE estar aislado (puerto tipado) sin acoplar el dominio.
- **FR-005**: Desactivar el adapter NO DEBE romper el motor de historia ni el estudio.

### Key Entities

- **DirectorSession**: sesión con estado, configuración y prompt version.

## Success Criteria

- **SC-001**: Una sesión puede iniciarse y rastrear versiones de prompt.
- **SC-002**: Cambiar el prompt produce una nueva versión trazable.
- **SC-003**: Desactivar el adapter no rompe el motor de historia.

## Assumptions

- El director realtime es una capacidad avanzada; la generación asíncrona (004/005/014) sigue siendo la vía principal.
