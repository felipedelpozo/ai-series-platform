# Feature Specification: Cost Observability & Operations

**Feature Branch**: `025-cost-observability-operations`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear el panel operativo y de costes necesario para usar la plataforma
de forma sostenible."

## Clarifications

### Session 2026-09-04

- Q: ¿De dónde sale el coste? → A: Se registra estimación antes de operaciones caras y coste real
  después; se agrega por proveedor/modelo y por serie/episodio.
- Q: ¿Qué es un job atascado? → A: `running` más de 10 min o `queued` con intentos agotados.
- Q: ¿Output huérfano? → A: Asset cuyo `generation_id` referencia una generación inexistente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Coste de un episodio (Priority: P1)

El creador conoce aproximadamente cuánto costó producir un episodio.

**Why this priority**: Sostenibilidad económica del producto.

**Independent Test**: Registrar costes estimados y reales y agregarlos por serie/episodio.

**Acceptance Scenarios**:

1. **Given** registros de coste, **When** se consulta por serie/episodio, **Then** devuelve el total
   agregado.

### User Story 2 - Localizar un job fallido (Priority: P2)

Un operador localiza un job fallido desde el episodio hasta el attempt del proveedor.

**Why this priority**: Trazabilidad operativa de fallos.

**Independent Test**: Consultar la traza de jobs fallidos con attempts y correlation ids.

**Acceptance Scenarios**:

1. **Given** un job fallido, **When** se consulta la traza, **Then** se ve el intento, el error y el
   correlation id.

## Requirements *(mandatory)*

- **FR-001**: DEBE reportar coste por provider/model.
- **FR-002**: DEBE reportar coste por serie, episodio, escena y shot.
- **FR-003**: DEBE reportar duración de cola/generación.
- **FR-004**: DEBE reportar success/error/retry rate.
- **FR-005**: DEBE listar jobs activos/atascados.
- **FR-006**: DEBE reportar consumo por tipo de generación.
- **FR-007**: DEBE ofrecer presupuesto/alertas simples.
- **FR-008**: DEBE inspeccionar errores con correlation IDs.
- **FR-009**: DEBE limpiar/reprocesar jobs seguros.
- **FR-010**: DEBE detectar outputs huérfanos.
- **FR-011**: DEBE registrar estimación antes de operaciones caras cuando sea posible.
- **FR-012**: La UI NO DEBE exponer secretos ni datos innecesariamente sensibles.

### Key Entities

- **CostRecord**: estimación o coste real de una operación con contexto de proveedor/modelo y
  serie/episodio/escena/shot.

## Success Criteria

- **SC-001**: El creador puede saber aproximadamente cuánto costó producir un episodio.
- **SC-002**: Un operador puede localizar un job fallido desde el episodio hasta el attempt del
  proveedor.

## Assumptions

- El coste real se estima a partir de heurísticas por tipo/modelo cuando el proveedor no lo devuelve.
- Los costes se registran en `cost_records`; la duración se toma de los attempts del job.
