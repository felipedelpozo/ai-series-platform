# Feature Specification: Audience Decision Engine

**Feature Branch**: `022-audience-decision-engine`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Convertir señales de audiencia en una decisión narrativa
estructurada, explicable y editable."

## Clarifications

### Session 2026-09-04

- Q: ¿Dónde se aplica la decisión? → A: La decisión aprobada NO muta el StoryState en esta
  feature; queda disponible para que la siguiente feature (023) la aplique como transición.
- Q: ¿Qué reglas de ponderación? → A: Reglas configurables por decisión (pesos por tipo de
  señal) con valores por defecto; persistidas junto a la decisión para trazabilidad.
- Q: ¿IA obligatoria? → A: El pipeline determinista (moderación → intención → clustering →
  candidatos → scoring) es siempre ejecutable; los prompts `audience.classify`/`audience.decide`
  enriquecen cuando hay proveedor, con fallback determinista.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Producir una decisión explicable (Priority: P1)

Convertir señales limpias en candidatos, puntuación, ganador, alternativas y confianza, con una
explicación legible de por qué ganó.

**Why this priority**: Es el corazón del MVP: convierte datos de audiencia en una acción narrativa.

**Independent Test**: Importar señales, ejecutar el motor y comprobar que devuelve candidatos
entendibles con ganador y justificación.

**Acceptance Scenarios**:

1. **Given** señales con votos explícitos y comentarios espontáneos, **When** se ejecuta el motor,
   **Then** se producen candidatos puntuados con un ganador y alternativas.
2. **Given** señales ambiguas, **When** se ejecuta el motor, **Then** la confianza refleja la
   ambigüedad y el ganador es el candidato mejor puntuado.

### User Story 2 - Revisión humana y corrección (Priority: P2)

El creador puede revisar, corregir o elegir otra decisión antes de aplicarla.

**Why this priority**: Mantiene el control humano sobre la narrativa.

**Independent Test**: Proponer una decisión, aprobarla tal cual o elegir una alternativa y
verificar que la selección queda registrada.

**Acceptance Scenarios**:

1. **Given** una decisión propuesta, **When** el creador la aprueba, **Then** pasa a `approved`
   sin modificar StoryState.
2. **Given** una decisión propuesta, **When** el creador elige otra alternativa, **Then** el
   ganador queda corregido y la elección es trazable.

## Requirements *(mandatory)*

- **FR-001**: DEBE moderar/filtrar (spam e inválidas) antes de decidir.
- **FR-002**: DEBE detectar intención (voto explícito, sugerencia espontánea, reacción).
- **FR-003**: DEBE agrupar sugerencias semánticamente (clustering).
- **FR-004**: DEBE generar candidatos con scoring.
- **FR-005**: DEBE elegir ganador, alternativas y confianza.
- **FR-006**: DEBE impedir que spam/repetición simple domine.
- **FR-007**: DEBE explicar por qué se eligió la decisión.
- **FR-008**: DEBE permitir revisión humana antes de aplicarla.
- **FR-009**: DEBE usar prompts editables `audience.classify` y `audience.decide` donde
  intervenga IA, con fallback determinista.
- **FR-010**: DEBE guardar outputs estructurados y snapshots.
- **FR-011**: NO DEBE modificar StoryState hasta aprobación (y ni siquiera entonces en esta
  feature; la aplicación es responsabilidad de la feature 023).

### Key Entities

- **AudienceDecision**: decisión propuesta (ganador, alternativas, confianza, justificación,
  reglas aplicadas, snapshot, estado del flujo de revisión).
- **DecisionCandidate**: candidato puntuado derivado de señales (intención, soporte, score).

## Success Criteria

- **SC-001**: Un conjunto de comentarios ambiguos produce candidatos entendibles.
- **SC-002**: El creador puede corregir/seleccionar otra decisión.
- **SC-003**: La decisión aprobada queda trazable a señales y reglas.

## Assumptions

- La aplicación de la decisión al StoryState corresponde a la feature 023.
- El pipeline determinista es la base verificable; la IA es un enriquecimiento opcional.
- La confianza se expresa como valor normalizado 0..1.
