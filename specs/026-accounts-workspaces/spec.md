# Feature Specification: Accounts & Workspaces

**Feature Branch**: `026-accounts-workspaces`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "Convertir el producto validado en plataforma multiusuario sin rehacer
el dominio existente."

## Clarifications

### Session 2026-09-04

- Q: ¿Mecanismo de auth? → A: Credenciales email/password con hash seguro (scrypt) y sesiones
  opacas server-side.
- Q: ¿Roles? → A: `owner`, `editor`, `viewer`; editor crea/genera, viewer solo consulta.
- Q: ¿Migración del workspace interno? → A: El primer usuario registrado adopta como `owner` el
  workspace `default` existente, preservando series/assets/prompts/jobs.
- Q: ¿Cuotas? → A: Créditos mensuales por workspace con límite y uso acumulado; gastar exige rol
  editor+.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro, login y aislamiento (Priority: P1)

Un usuario se registra/inicia sesión y solo accede a los datos de sus workspaces.

**Why this priority**: Es la base de la plataforma multiusuario.

**Independent Test**: Registrar dos usuarios y dos workspaces; verificar que ninguno obtiene rol en
el workspace del otro.

**Acceptance Scenarios**:

1. **Given** dos workspaces distintos, **When** un usuario consulta sus roles, **Then** solo tiene
   acceso a los suyos.

### User Story 2 - Roles e invitaciones (Priority: P2)

Un editor crea/genera; un viewer solo consulta; las invitaciones otorgan roles.

**Why this priority**: Control de acceso y colaboración.

**Independent Test**: Invitar a un usuario y verificar que la acción de escritura exige editor+.

**Acceptance Scenarios**:

1. **Given** un viewer, **When** intenta una acción de gasto de créditos, **Then** se rechaza.
2. **Given** un editor, **When** crea/genera, **Then** se permite.

## Requirements *(mandatory)*

- **FR-001**: DEBE permitir registro/login seguro.
- **FR-002**: DEBE modelar usuarios y sesiones.
- **FR-003**: DEBE modelar workspaces con miembros y roles owner/editor/viewer.
- **FR-004**: DEBE aislar datos por workspace.
- **FR-005**: DEBE permitir invitaciones.
- **FR-006**: DEBE ofrecer settings de workspace.
- **FR-007**: DEBE asociar ownership de series/assets/prompts/jobs al workspace.
- **FR-008**: DEBE preparar cuotas/rate limits para consumo de IA.
- **FR-009**: DEBE migrar el workspace interno existente a uno real sin perder datos.
- **FR-010**: DEBE exigir autorización en endpoints que gastan créditos.

### Key Entities

- **User**: cuenta con credenciales.
- **Session**: sesión opaca con expiración.
- **WorkspaceMember**: rol de un usuario en un workspace.
- **Invitation**: invitación pendiente a un workspace.
- **WorkspaceQuota**: límite y uso de créditos mensuales.

## Success Criteria

- **SC-001**: Dos workspaces no pueden acceder a los datos del otro.
- **SC-002**: Un editor puede crear/generar.
- **SC-003**: Un viewer solo consulta.
- **SC-004**: Los endpoints que gastan créditos exigen autorización.

## Assumptions

- El workspace `default` existe desde la migración inicial y es adoptado por el primer usuario.
- El auth se expone mediante token Bearer en las rutas de cuentas; la migración progresiva de los
  endpoints de dominio existentes queda fuera del alcance de esta feature.
