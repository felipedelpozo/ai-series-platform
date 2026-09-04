# Feature Specification: PostgreSQL + Drizzle Core

**Feature Branch**: `002-postgres-drizzle-core`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Añadir la persistencia base del producto y un modelo mínimo común para
soportar las siguientes vertical slices. Conectar a PostgreSQL real, migraciones reproducibles
desde base vacía, workspace interno por defecto, auditoría mínima, health check de base de datos,
tests de integración reales, datos independientes de la UI y fallo accionable ante configuración
inválida."

## Clarifications

### Session 2026-09-04

- Q: ¿Qué driver de PostgreSQL se usa? → A: `postgres` (postgres.js) vía el driver `postgres-js`
  de Drizzle, por compatibilidad con Bun.
- Q: ¿Cómo se crea el workspace interno por defecto? → A: Se siembra de forma idempotente
  (upsert por slug) al migrar o al arrancar, sin paso manual.
- Q: ¿Alcance de la auditoría en esta feature? → A: Tabla `audit_log` mínima
  (actor/action/entity/metadata/timestamp); el cableado de "cambios importantes" se conecta en
  features posteriores.
- Q: ¿Aislamiento de los tests de integración? → A: Usan una base `ai_series_test` dedicada,
  creada idempotentemente y migrada antes de cada suite.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Migraciones reproducibles desde base vacía (Priority: P1)

Un operador aplica las migraciones sobre una base vacía y obtiene el esquema completo, de forma
reproducible, con las tablas base de la plataforma.

**Why this priority**: Sin persistencia reproducible no hay base para ninguna vertical slice.

**Independent Test**: Crear una base vacía, aplicar migraciones y verificar que el esquema queda
creado.

**Acceptance Scenarios**:

1. **Given** una base PostgreSQL vacía, **When** se aplican las migraciones, **Then** el esquema
   completo queda creado sin errores.
2. **Given** migraciones ya aplicadas, **When** se vuelven a aplicar, **Then** no hay efectos
   duplicados ni errores.

---

### User Story 2 - Capa de datos común para web y worker (Priority: P1)

La aplicación web y el worker leen y escriben a través de una única capa de datos compartida, sin
que ninguno dependa de estructuras internas de la UI.

**Why this priority**: Evita duplicar lógica de persistencia y prepara el producto multiusuario.

**Independent Test**: Desde la capa compartida, insertar y leer un registro desde un proceso de
prueba que represente tanto a web como a worker.

**Acceptance Scenarios**:

1. **Given** la capa de datos, **When** se inserta un workspace, **Then** puede leerse de vuelta
   por la misma capa.
2. **Given** la capa de datos, **When** se ejecuta un health check, **Then** responde si la base
   está accesible.

---

### User Story 3 - Workspace interno por defecto (Priority: P2)

Existe un workspace interno por defecto aunque todavía no haya autenticación, para no rehacer las
relaciones al convertir el producto en multiusuario.

**Why this priority**: Fija el contenedor de datos desde el inicio sin acoplar autenticación.

**Independent Test**: Consultar el workspace por defecto y confirmar que existe tras el arranque.

**Acceptance Scenarios**:

1. **Given** migraciones aplicadas, **When** se arranca la plataforma, **Then** existe un
   workspace interno por defecto.

---

### User Story 4 - Auditoría mínima (Priority: P2)

Los cambios importantes pueden registrarse en un registro de auditoría mínimo y trazable.

**Why this priority**: Establece la trazabilidad base para seguridad y operación.

**Independent Test**: Registrar una entrada de auditoría y leerla de vuelta.

**Acceptance Scenarios**:

1. **Given** la capa de datos, **When** se registra una acción importante, **Then** queda
   persistida con actor, acción, entidad y timestamp.

---

### User Story 5 - Configuración de base de datos inválida (Priority: P2)

Si la configuración de base de datos es inválida, la plataforma falla con un error accionable,
sin imprimir secretos.

**Why this priority**: Previene fallos oscuros de conexión en runtime.

**Independent Test**: Inicializar la capa de datos con una URL inválida y confirmar el error
accionable.

**Acceptance Scenarios**:

1. **Given** una `DATABASE_URL` mal formada, **When** se inicializa la capa de datos, **Then**
   falla con un error que nombra la variable sin exponer credenciales.

---

### Edge Cases

- ¿Qué ocurre si la base no está accesible? El health check reporta "down" sin lanzar un error
  fatal.
- ¿Qué ocurre si `DATABASE_URL` falta? La capa de datos reporta configuración ausente; el health
  check devuelve "not-configured".
- ¿Qué ocurre si se ejecutan migraciones sobre una base no vacía con un esquema previo? Se
  respetan las migraciones ya aplicadas (tracking de migraciones).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La plataforma DEBE conectarse a una base PostgreSQL real mediante una capa de datos
  común (`packages/db`).
- **FR-002**: DEBE poder migrar una base vacía de forma reproducible mediante migraciones
  versionadas.
- **FR-003**: DEBE existir un workspace interno por defecto, sembrado de forma idempotente, sin
  requerir autenticación.
- **FR-004**: DEBE existir un registro de auditoría mínimo para cambios importantes.
- **FR-005**: DEBE proporcionarse un health check de base de datos.
- **FR-006**: DEBEN existir tests de integración reales contra PostgreSQL (conexión, migración y
  operaciones base).
- **FR-007**: El modelo de datos DEBE ser independiente de las estructuras internas de la UI.
- **FR-008**: La plataforma DEBE fallar con un error accionable si la configuración de base de
  datos es inválida.
- **FR-009**: Ningún secreto DEBE imprimirse en logs o UI.

### Key Entities

- **Workspace**: contenedor de datos por defecto (id, nombre, slug único, timestamps).
- **AuditRecord**: registro mínimo de un cambio importante (actor, acción, tipo de entidad, id de
  entidad, metadata, timestamp).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una base vacía puede migrarse completamente con un único comando, sin pasos
  manuales.
- **SC-002**: La web y el worker leen/escriben mediante la misma capa compartida.
- **SC-003**: Existen tests reales de conexión, migración y operaciones base que pasan contra
  PostgreSQL.
- **SC-004**: Una `DATABASE_URL` inválida produce un error accionable que nombra la variable y no
  expone secretos.

## Assumptions

- PostgreSQL es la fuente de verdad (constitución X); Drizzle define schema y migraciones.
- Hay un PostgreSQL real disponible en desarrollo para los tests de integración.
- La autenticación y el multiusuario reales quedan fuera de alcance (feature posterior).
