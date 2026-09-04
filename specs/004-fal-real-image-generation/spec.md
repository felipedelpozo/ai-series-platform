# Feature Specification: Real fal.ai Image Generation

**Feature Branch**: `004-fal-real-image-generation`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Construir la primera vertical slice de generación REAL: desde el
Prompt Studio hasta una imagen generada externamente y visible en la plataforma."

## Clarifications

### Session 2026-09-04

- Q: ¿Modelo por defecto? → A: `fal-ai/nano-banana-2` (definido en el plan base; configurable).
- Q: ¿Cómo se evita bloquear el request HTTP? → A: Submit vía cola de fal (`queue.submit`) y
  polling de estado por `queue.status`; el resultado se ingiere a almacenamiento local.
- Q: ¿Dónde se guardan las imágenes? → A: En `ASSET_STORE_DIR` (persistencia local controlada);
  el asset guarda una URL interna, no la URL temporal del proveedor.
- Q: ¿El smoke live es parte del suite normal? → A: No. Es un script opt-in (`test:live:fal`) que
  exige `FAL_KEY` y gasta saldo; el suite normal mockea la red para ramas deterministas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar una imagen real desde el Generation Lab (Priority: P1)

El creador selecciona una plantilla `test.image`/`image.generate`, edita variables/parámetros,
inicia la generación y ve los estados reales (queued/running/succeeded/failed) hasta la imagen.

**Independent Test**: Generar una imagen con credenciales válidas y verla en la app.

**Acceptance Scenarios**:

1. **Given** una plantilla activa, **When** el creador inicia la generación, **Then** se crea una
   generación en estado queued y el request no queda bloqueado.
2. **Given** una generación en curso, **When** se consulta su estado, **Then** progresa a
   running/succeeded/failed de forma observable.
3. **Given** una generación exitosa, **When** se recarga la página, **Then** la imagen y su
   metadata persisten.

---

### User Story 2 - Trazabilidad al Prompt Registry (Priority: P1)

Cada generación conserva el prompt snapshot exacto, modelo, parámetros y request ID.

**Independent Test**: Inspeccionar una generación y ver su snapshot/parámetros.

**Acceptance Scenarios**:

1. **Given** una generación, **When** se inspecciona, **Then** se ven el prompt renderizado, la
   versión, las variables, el modelo, los parámetros y el request ID.

---

### User Story 3 - Reintento y error útil (Priority: P2)

Un fallo muestra un mensaje útil y permite reintentar.

**Independent Test**: Provocar un fallo y reintentar.

**Acceptance Scenarios**:

1. **Given** una generación fallida, **When** se muestra, **Then** aparece un error útil y el
   estado failed.
2. **Given** una generación fallida, **When** se reintenta, **Then** se crea una nueva generación
   sin perder la anterior.

---

### Edge Cases

- ¿Qué ocurre si `FAL_KEY` falta? El endpoint de generación falla con un error accionable; no se
  expone la credencial.
- ¿Qué ocurre si la URL temporal del proveedor expira? El asset se ingiere a almacenamiento local
  al éxito.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: DEBE existir una ruta de generación de imagen que use fal.ai real (sin proveedor fake).
- **FR-002**: La generación DEBE persistir estados queued/running/succeeded/failed.
- **FR-003**: Cada generación DEBE guardar prompt snapshot, variables, modelo, parámetros y request ID.
- **FR-004**: La imagen generada DEBE registrarse como asset con URL interna persistente.
- **FR-005**: `FAL_KEY` DEBE ser solo servidor y NUNCA llegar al navegador.
- **FR-006**: DEBE existir un smoke test opt-in repetible y barato contra fal.ai.
- **FR-007**: DEBE poderse reintentar una generación fallida sin perder el histórico.
- **FR-008**: El resultado DEBE persistir tras recargar.

### Key Entities

- **ImageGeneration**: propósito, plantilla/versión, snapshot, proveedor, modelo, estado,
  request ID, parámetros, error, duración.
- **Asset**: imagen generada con metadata (mime, dimensiones, URL interna, proveedor/modelo).

## Success Criteria *(mandatory)*

- **SC-001**: Con cuenta válida y saldo, se genera una imagen real end-to-end desde la UI.
- **SC-002**: El resultado persiste tras recargar.
- **SC-003**: Se inspecciona exactamente qué prompt/parámetros generaron el asset.

## Assumptions

- La cuenta fal.ai tiene saldo y `FAL_KEY` válida.
- El almacenamiento local (`ASSET_STORE_DIR`) es suficiente hasta la migración a object storage.
