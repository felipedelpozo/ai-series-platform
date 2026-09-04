# Feature Specification: Audio, Voice & SFX

**Feature Branch**: `019-audio-voice-sfx`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Añadir la capa de audio necesaria para que un episodio pueda pasar de
clips visuales a pieza publicable."

## Clarifications

### Session 2026-09-04

- Q: ¿Proveedor de voz? → A: OpenAI TTS (tts-1); el adapter queda aislado y reemplazable.
- Q: ¿Granularidad? → A: Pista de audio por shot (diálogo), guardada como asset de audio con job
  independiente para regenerar sin regenerar el vídeo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generar voz por shot (Priority: P1)

Generar diálogo/voz para un shot y guardarlo como asset de audio reproducible.

### User Story 2 - Regenerar solo el audio (Priority: P1)

Cambiar una pista no obliga a regenerar el vídeo.

## Requirements *(mandatory)*

- **FR-001**: DEBE poder generarse voz/diálogo por shot con TTS.
- **FR-002**: El audio DEBE guardarse como asset en la biblioteca.
- **FR-003**: DEBE poder regenerarse solo el audio (job independiente).
- **FR-004**: El adapter de voz DEBE estar aislado y ser reemplazable.

### Key Entities

- **AudioTrack**: pista de audio (shot, tipo, estado, asset).

## Success Criteria

- **SC-001**: Al menos un episodio de prueba tiene voz reproducible y trazable.
- **SC-002**: Cambiar una pista no regenera el vídeo.

## Assumptions

- OPENAI_API_KEY disponible para TTS.
