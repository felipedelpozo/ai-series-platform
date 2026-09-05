# Feature Specification: Real fal.ai Video Generation

**Feature Branch**: `005-fal-real-video-generation`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Extender Generation Lab con una vertical slice de vídeo REAL para
validar H3 Max desde el inicio del proyecto."

## Clarifications

### Session 2026-09-04

- Q: ¿Modelos? → A: `minimax/h3-max/text-to-video` e `minimax/h3-max/image-to-video` (configurables).
- Q: ¿Cómo se resuelve la imagen fuente para image-to-video? → A: Se sube el asset local a
  `fal.storage.upload` y se pasa la URL pública como `image_url`.
- Q: ¿Aceptación live? → A: Un vídeo real generado (text-to-video) mediante smoke opt-in; no hay
  mock ni vídeo dummy.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar vídeo desde texto (Priority: P1)

El creador selecciona `test.video`/`video.generate`, edita variables/parámetros y genera un vídeo
real, viendo estados y el vídeo reproducible.

**Acceptance Scenarios**:

1. **Given** una plantilla de vídeo, **When** inicia la generación, **Then** se crea una
   generación queued sin bloquear el request.
2. **Given** una generación de vídeo, **When** completa, **Then** el vídeo es reproducible en la app.
3. **Given** una generación en curso, **When** se recarga, **Then** el job no se pierde.

---

### User Story 2 - Generar vídeo desde imagen (Priority: P2)

Con un asset de imagen existente, el creador inicia image-to-video y el resultado queda vinculado
al asset fuente.

**Acceptance Scenarios**:

1. **Given** un asset de imagen, **When** inicia image-to-video, **Then** la imagen se sube al
   proveedor y la generación usa su URL.

---

### User Story 3 - Reintento y errores (Priority: P2)

Un fallo muestra error útil y permite reintentar; regenerar con prompt modificado no pierde la
versión anterior.

**Acceptance Scenarios**:

1. **Given** un vídeo fallido, **When** se muestra, **Then** hay error útil y estado failed.

---

### Edge Cases

- ¿Qué ocurre si el asset fuente no existe o no es una imagen? La generación falla con error claro.
- ¿Qué ocurre si `FAL_KEY` falta? Error accionable sin exponer la credencial.

## Requirements *(mandatory)*

- **FR-001**: DEBE existir generación de vídeo real (text-to-video) sin proveedor fake.
- **FR-002**: DEBE existir image-to-video usando un asset de imagen existente.
- **FR-003**: La UI DEBE representar el trabajo asíncrono (queued/running/succeeded/failed) con
  request ID, modelo, duración, resultado, error y reintento.
- **FR-004**: El vídeo final DEBE ser reproducible en la app.
- **FR-005**: El resultado DEBE persistir tras recargar.
- **FR-006**: Cada ejecución DEBE conservar prompt snapshot, variables, modelo y parámetros.
- **FR-007**: `FAL_KEY` DEBE ser solo servidor.
- **FR-008**: DEBE existir smoke live opt-in contra fal.ai (H3 Max).

### Key Entities

- **VideoGeneration**: como la generación de imagen, con `kind=video` y asset fuente opcional.
- **Asset**: vídeo generado con metadata y URL interna persistente.

## Success Criteria

- **SC-001**: Con cuenta válida se genera un vídeo real end-to-end desde la UI.
- **SC-002**: Un refresh no pierde el job.
- **SC-003**: Errores/reintentos quedan registrados.

## Assumptions

- La cuenta fal.ai tiene saldo; el vídeo es más caro/lento que la imagen (opt-in).
