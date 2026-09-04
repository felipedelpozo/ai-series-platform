# Feature Specification: Series + Series Bible

**Feature Branch**: `008-series-story-bible`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear el modelo de Series y Series Bible como origen creativo
estructurado de cada producción."

## Clarifications

### Session 2026-09-04

- Q: ¿Versionado de la Bible? → A: Revisiones versionadas; editar crea una nueva revisión y la
  activa, sin borrar las anteriores.
- Q: ¿Generación IA? → A: Propuesta inicial con el prompt `series.bible` (AI SDK + OpenAI),
  siempre editable, nunca aplicada silenciosamente como canon.
- Q: ¿Canon? → A: Lista de hechos no contradictorios + límites/prohibiciones, como campos JSONB.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CRUD de Series (Priority: P1)

El creador crea, renombra, duplica, archiva y abre una serie.

### User Story 2 - Series Bible estructurada (Priority: P1)

La Bible define título, premisa, género, tono, público, formato, idioma, duración objetivo, reglas
narrativas, estilo visual, canon y prohibiciones, con revisiones versionadas.

### User Story 3 - Propuesta IA editable (Priority: P2)

Generar una propuesta de Bible con IA produce un resultado editable, trazable al prompt/versión.

## Requirements *(mandatory)*

- **FR-001**: DEBE poder crearse/renombrarse/duplicarse/archivarse una serie.
- **FR-002**: La Bible DEBE capturar campos estructurados reutilizables por prompts.
- **FR-003**: La Bible DEBE tener revisiones versionadas sin alterar episodios ya producidos.
- **FR-004**: DEBE definirse canon (hechos) y límites/prohibiciones.
- **FR-005**: La generación IA DEBE producir un resultado editable, nunca aplicarlo silenciosamente.
- **FR-006**: DEBE trazarse qué prompt/versión produjo una propuesta generada.

### Key Entities

- **Series**: producción (nombre, slug, estado).
- **SeriesBible**: revisión versionada (campos creativos, canon, prohibiciones, origen, snapshot).

## Success Criteria

- **SC-001**: La serie existe como entidad persistente independiente del vídeo.
- **SC-002**: La Bible puede usarse como variables del Prompt Registry.
- **SC-003**: El contenido generado con IA es siempre editable.

## Assumptions

- Un workspace por defecto (Spec 002); multiusuario llega en Spec 026.
