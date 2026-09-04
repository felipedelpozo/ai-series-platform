# Feature Specification: TikTok Integration

**Feature Branch**: `024-tiktok-integration`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Añadir integración progresiva con TikTok sin convertirla en bloqueo
arquitectónico."

## Clarifications

### Session 2026-09-04

- Q: ¿Qué capacidades requieren API oficial? → A: `account.link`, `episode.publish` y
  `window.automate` requieren credenciales oficiales; `video.associate` e `engagement.import`
  funcionan en modo manual.
- Q: ¿Dónde se guardan los tokens? → A: Nunca en la base de datos ni en respuestas de API; solo
  referencia a credenciales server-side cuando existen.
- Q: ¿Scraping? → A: Prohibido; no se simula una API inexistente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Estado de conexión visible (Priority: P1)

El usuario ve qué capacidades de TikTok están conectadas y cuáles no.

**Why this priority**: La transparencia evita suponer capacidades inexistentes.

**Independent Test**: Consultar el estado de conexión y ver el mapa capacidad → conectada/manual/no
disponible.

**Acceptance Scenarios**:

1. **Given** sin credenciales, **When** se consulta el estado, **Then** las capacidades oficiales
   aparecen como no disponibles y las manuales como disponibles.

### User Story 2 - Asociar vídeo e importar engagement (Priority: P2)

Asociar un vídeo publicado externamente a un episodio e importar engagement permitido, sin API.

**Why this priority**: Mantiene el loop manual aportando valor real.

**Independent Test**: Asociar un vídeo e importar eventos; verificar trazabilidad del raw.

**Acceptance Scenarios**:

1. **Given** una serie y episodio, **When** se asocia un vídeo, **Then** queda vinculado.
2. **Given** eventos de engagement, **When** se importan, **Then** quedan trazables y alimentan
   señales de audiencia.

## Requirements *(mandatory)*

- **FR-001**: DEBE vincular una cuenta mediante el mecanismo oficial cuando la API esté disponible.
- **FR-002**: DEBE asociar un vídeo publicado externamente a un episodio.
- **FR-003**: DEBE importar el engagement permitido por la API o manualmente.
- **FR-004**: DEBE publicar/exportar desde la plataforma solo cuando las capacidades lo permitan.
- **FR-005**: DEBE automatizar apertura/cierre de ventana solo si es robusto.
- **FR-006**: DEBE seguir funcionando en modo manual si la API no da acceso a una capacidad.
- **FR-007**: NO DEBE usar scraping que viole términos.
- **FR-008**: DEBE mostrar qué capacidades están conectadas.
- **FR-009**: DEBE mantener tokens/credenciales seguros (no en DB ni en respuestas).
- **FR-010**: DEBE gestionar reintentos y rate-limit.
- **FR-011**: DEBE mantener trazables los raw events/imports.

### Key Entities

- **TikTokAccount**: vínculo de cuenta (sin token en claro).
- **TikTokVideo**: vídeo publicado asociado a serie/episodio.
- **EngagementImport**: lote de eventos crudos trazables.

## Success Criteria

- **SC-001**: La integración disponible oficialmente aporta valor real sin romper el loop manual.
- **SC-002**: Las capacidades no disponibles se muestran claramente y no rompen el flujo.

## Assumptions

- No hay credenciales oficiales de TikTok en el entorno; las fases API quedan UNAVAILABLE.
- La asociación e importación manuales usan la capa de señales existente (Spec 021).
