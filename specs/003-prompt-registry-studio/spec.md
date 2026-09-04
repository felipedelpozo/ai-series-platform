# Feature Specification: Prompt Registry + Prompt Studio

**Feature Branch**: `003-prompt-registry-studio`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Crear el Prompt Registry y el primer Prompt Studio. Los prompts deben
convertirse en objetos de producto editables y versionados antes de construir generación real."

## Clarifications

### Session 2026-09-04

- Q: ¿Cómo se declaran las variables? → A: Por versión, como un array `{ name, required, default }`
  en JSONB; la plantilla usa placeholders `{{name}}`.
- Q: ¿Semántica de versión activa? → A: Exactamente una versión activa por plantilla; activar una
  versión desactiva la anterior sin borrarla.
- Q: ¿Modelo de scope? → A: `scopeType` enum (global/workspace/series/episode/scene/shot) + `scopeId`
  opcional; ahora solo se siembran/usan plantillas globales; los overrides se conectan en features
  posteriores.
- Q: ¿Inmutabilidad del snapshot? → A: Los snapshots son insert-only; nunca se actualizan ni borran.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plantillas versionadas (Priority: P1)

Un creador crea una plantilla de prompt con propósito, descripción, texto, variables y contrato de
salida; al editarla se genera una nueva versión sin mutar el histórico.

**Independent Test**: Crear una plantilla, editarla y comprobar que quedan dos versiones.

**Acceptance Scenarios**:

1. **Given** el Prompt Registry, **When** se crea una plantilla, **Then** queda una versión 1 activa.
2. **Given** una plantilla existente, **When** se edita su texto, **Then** se crea una versión nueva
   y la versión anterior permanece intacta.

---

### User Story 2 - Preview con variables (Priority: P1)

El creador previsualiza el prompt renderizado con un conjunto de variables; si falta una variable
requerida, el preview lo detecta.

**Independent Test**: Renderizar una plantilla con variables completas y con una variable faltante.

**Acceptance Scenarios**:

1. **Given** una plantilla con variables, **When** se previsualiza con todas las variables, **Then**
   muestra el texto renderizado.
2. **Given** una plantilla con una variable requerida, **When** falta esa variable, **Then** el
   preview reporta la variable faltante.

---

### User Story 3 - Activar, archivar, clonar y rollback (Priority: P2)

El creador activa/archiva/clona plantillas y vuelve a activar una versión anterior sin borrar las
posteriores.

**Independent Test**: Activar una versión antigua y comprobar que pasa a ser la activa.

**Acceptance Scenarios**:

1. **Given** una plantilla con varias versiones, **When** se activa una versión anterior, **Then**
   esa versión pasa a ser la activa.
2. **Given** una plantilla, **When** se archiva, **Then** deja de estar disponible para nuevos usos
   pero conserva su histórico.
3. **Given** una plantilla, **When** se clona, **Then** se crea una plantilla nueva independiente.

---

### User Story 4 - Prompt Studio (Priority: P2)

Existe una UI de Prompt Studio con listado, filtro por propósito, editor, variables y preview.

**Independent Test**: Abrir el Studio, filtrar por propósito, editar y previsualizar.

**Acceptance Scenarios**:

1. **Given** el Studio, **When** el creador lista plantillas y filtra por propósito, **Then** ve
   solo las del propósito elegido.
2. **Given** el Studio, **When** el creador edita una plantilla, **Then** puede previsualizar el
   prompt renderizado.

---

### User Story 5 - Seeds editables (Priority: P2)

Se siembran plantillas iniciales para `test.image` y `test.video`, editables desde la UI.

**Independent Test**: Ver los seeds y editarlos desde la UI.

**Acceptance Scenarios**:

1. **Given** el arranque, **When** no existen seeds, **Then** se crean `test.image` y `test.video`.
2. **Given** un seed, **When** se edita, **Then** se crea una versión nueva (los seeds no son fijos).

---

### User Story 6 - Snapshot inmutable (Priority: P3)

Una ejecución futura puede guardar un snapshot inmutable del prompt final usado.

**Independent Test**: Guardar un snapshot y comprobar que es inmutable.

**Acceptance Scenarios**:

1. **Given** una versión activa y unas variables, **When** se guarda un snapshot, **Then** queda
   persistido con texto renderizado, versión, variables, modelo y parámetros.

---

### Edge Cases

- ¿Qué ocurre al previsualizar sin variables? Se detectan las requeridas faltantes.
- ¿Qué ocurre al activar una versión ya activa? Es idempotente.
- ¿Qué ocurre al editar una plantilla archivada? Se rechaza o se advierte.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir crear, editar, clonar, activar y archivar plantillas de prompt.
- **FR-002**: Cada plantilla DEBE tener propósito, nombre, descripción, texto de plantilla,
  variables disponibles, variables requeridas, defaults y contrato de salida opcional.
- **FR-003**: Editar una plantilla DEBE crear una nueva versión; el histórico NUNCA cambia retroactivamente.
- **FR-004**: El sistema DEBE permitir previsualizar el prompt renderizado y detectar variables requeridas faltantes.
- **FR-005**: DEBE distinguirse la plantilla global por defecto de los overrides por scope.
- **FR-006**: DEBEN prepararse scopes para workspace, serie, episodio, escena y shot.
- **FR-007**: DEBE existir una UI de Prompt Studio con listado, filtro por propósito, editor, variables y preview.
- **FR-008**: DEBEN sembrarse plantillas iniciales editables para `test.image` y `test.video`.
- **FR-009**: DEBE existir un mecanismo de snapshot inmutable del prompt final usado por una ejecución.
- **FR-010**: DEBEN existir los 20 purposes iniciales definidos por la plataforma.
- **FR-011**: Ningún consumidor DEBE necesitar un string de prompt hardcoded para estos purposes.

### Key Entities

- **PromptTemplate**: propósito, nombre, descripción, scope y estado (activa/archivada).
- **PromptVersion**: texto, variables, contrato de salida, número de versión y flag activa.
- **PromptScope**: tipo de scope (global/workspace/serie/episodio/escena/shot) y id opcional.
- **GenerationPromptSnapshot**: texto renderizado, versión, variables, modelo, parámetros (inmutable).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Editar una plantilla produce una nueva versión y el histórico permanece intacto.
- **SC-002**: El preview detecta variables requeridas faltantes.
- **SC-003**: Un consumidor puede resolver el prompt activo de un propósito sin strings hardcoded.
- **SC-004**: Los 20 purposes iniciales están representados y sus seeds son editables.

## Assumptions

- Las plantillas globales viven en el workspace interno por defecto (Spec 002).
- Los overrides de serie/episodio/escena/shot se conectan cuando existan esas entidades (features posteriores).
