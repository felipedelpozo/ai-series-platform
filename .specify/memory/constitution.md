<!--
Sync Impact Report
  Version change: (template) -> 1.0.0
  Added sections: Core Principles (15), Governance
  Removed sections: none (template placeholders replaced)
  Templates requiring updates:
    - .specify/templates/spec-template.md: no structural change required
    - .specify/templates/plan-template.md: no structural change required
    - .specify/templates/tasks-template.md: no structural change required
  Follow-up TODOs: none
-->

# AI Series Platform Constitution

## Core Principles

### I. Spec-Driven Development

La constitución es la autoridad superior del proyecto. Todo cambio funcional relevante
nace de una feature spec. `spec.md` describe QUÉ y POR QUÉ; las decisiones técnicas
pertenecen a `plan.md`.

- Para features de producción se usa el ciclo:
  `specify -> clarify -> checklist -> plan -> tasks -> analyze -> implement -> converge`.
- No se comienza una feature posterior con gaps críticos abiertos en la anterior.

### II. Monorepo Bun-First

- Un único repositorio y una única secuencia global de specs.
- Bun es runtime, package manager, workspace manager y test runner por defecto.
- Se usan Bun workspaces y catalogs en el `package.json` raíz.
- Se evitan Turborepo, pnpm, npm y yarn salvo necesidad demostrada y documentada mediante ADR.
- TypeScript estricto en todo el monorepo; ESM por defecto.
- Las dependencias compartidas centralizan versiones mediante catalogs cuando sea práctico.

### III. Stack Moderno y Actualizable

- Resolver las últimas versiones estables y compatibles en el momento de implementar cada feature.
- Stack base obligatorio: Bun, TypeScript, Next.js App Router, React, Tailwind CSS v4+,
  shadcn/ui, Radix UI como base de primitives, AI SDK, Zod 4+, PostgreSQL y Drizzle ORM.
- Usar Next.js estable y con parches de seguridad; no usar una versión vulnerable por
  mantener un número antiguo.
- Usar `shadcn@latest` y reutilizar componentes/Blocks oficiales antes de construir
  equivalentes desde cero.
- No introducir dependencias grandes para problemas que el stack ya resuelve.
- Pre-releases están prohibidas salvo que una integración explícitamente las requiera;
  deben aislarse y documentarse.

### IV. shadcn/Radix y Calidad de Interfaz

- La interfaz se construye sobre shadcn/ui + Radix.
- Antes de crear una pantalla compleja, revisar si existe un shadcn Block reutilizable/adaptable.
- Tailwind se usa para styling; evitar CSS ad-hoc salvo casos justificados.
- Accesibilidad de teclado, focus visible, labels, estados disabled/loading/error y
  contraste son obligatorios.
- Desktop-first para el estudio de creación, responsive para resoluciones menores.
- La UI debe mostrar progreso real de operaciones largas, no loaders infinitos sin estado.

### V. Generación Real Desde el Principio

- fal.ai es el proveedor inicial obligatorio de generación de imagen y vídeo.
- No se implementan providers falsos en desarrollo o producción.
- No se usan imágenes/vídeos prefabricados para simular que una integración funciona.
- Las specs tempranas de imagen/vídeo deben incluir smoke tests live contra fal.ai.
- Las pruebas unitarias pueden mockear la red solo para probar ramas deterministas,
  errores o timeouts; nunca sustituyen el criterio de aceptación live.
- `FAL_KEY` es secreto de servidor y jamás se expone al navegador.
- Toda operación generativa larga debe usar APIs asíncronas/queue/webhook cuando corresponda.

### VI. Prompts Como Datos Editables y Versionados

- Ningún prompt de negocio significativo debe quedar como string inmutable escondido en servicios.
- Los prompts son entidades persistentes, tipadas, versionadas y editables desde la UI.
- Deben soportar defaults, overrides por serie/episodio/escena/shot, variables declaradas,
  validación, preview renderizado, clonación, rollback y activación de versión.
- Cada generación guarda un snapshot inmutable con prompt renderizado, versión de plantilla,
  variables, modelo, parámetros, referencias y resultado.
- Modificar un prompt nunca reescribe el histórico.
- Debe ser posible saber exactamente qué prompt generó cada asset.

### VII. Domain-First, Providers Reemplazables

- El dominio de serie, historia, episodios, escenas, shots, assets y decisiones no depende
  directamente de SDKs de proveedores.
- fal.ai, H3 Max Director, ComfyUI u otros proveedores se integran detrás de ports/adapters tipados.
- ComfyUI es opcional y reemplazable; nunca una dependencia estructural del Story Engine o
  Episode Studio.
- Los adapters validan entradas/salidas con Zod y convierten errores externos a errores de
  dominio tipados.

### VIII. Historia y Continuidad Como Fuente de Verdad

- El núcleo de la plataforma es StoryState + SeriesBible, no el fichero de vídeo.
- Cada episodio tiene estado narrativo antes/después.
- Personajes, localizaciones, props y referencias son entidades versionadas.
- Nunca depender únicamente del historial del LLM para continuidad.
- Las decisiones de audiencia deben producir cambios explícitos y trazables en StoryState.

### IX. Trabajos Asíncronos, Idempotencia y Reintentos

- Ningún request HTTP mantiene abierta la generación completa de un episodio.
- Jobs persistentes con estado, attempts, idempotency key, timestamps, provider request IDs,
  coste estimado/real cuando exista, errores y outputs.
- Reintentos controlados y operaciones idempotentes.
- Poder regenerar un shot fallido sin regenerar todo un episodio.
- Para MVP, preferir cola respaldada por PostgreSQL antes de añadir Redis/Kafka.

### X. Persistencia y Migraciones

- PostgreSQL es la fuente de verdad.
- Drizzle define schema y migraciones.
- No hacer `push` destructivo en entornos compartidos.
- Cada cambio de schema debe tener migración reproducible.
- Constraints e índices importantes se expresan en base de datos, no solo en TypeScript.
- Zod valida los límites de entrada/salida; no duplicar manualmente tipos que puedan
  derivarse con seguridad.

### XI. Observabilidad y Coste

- Cada request y job tiene correlation/request ID.
- Logging estructurado, sin secretos ni prompts sensibles completos en logs de producción.
- Medir duración, cola, proveedor, modelo, errores, attempts y coste por generación.
- Debe poder atribuirse coste a serie, episodio, escena y shot.
- Registrar suficiente información para reproducir un fallo sin registrar credenciales.

### XII. Seguridad

- Secretos solo en servidor.
- Validar toda entrada no confiable con Zod.
- Proteger endpoints que puedan gastar créditos.
- Rate limiting/quotas cuando la plataforma sea multiusuario.
- Webhooks deben verificar autenticidad o aplicar la estrategia oficial del proveedor.
- Nunca interpolar contenido no confiable en SQL, shell o rutas de fichero.

### XIII. Testing con Pirámide Práctica

- `bun test` para dominio y lógica.
- Integration tests reales para DB.
- E2E para journeys críticos del estudio.
- Smoke tests live explícitos para fal.ai.
- Los tests de pago no se ejecutan accidentalmente en cada save/PR; deben ser opt-in
  mediante script y secret.
- Una integración externa no se considera terminada hasta haber pasado al menos un smoke
  test real documentado.

### XIV. Simplicidad y Vertical Slices

- Construir primero el loop mínimo completo, no veinte subsistemas incompletos.
- Preferir una implementación sencilla y observable antes que abstracciones prematuras.
- No crear microservicios. Monorepo modular con `apps/web`, `apps/worker` y paquetes compartidos.
- Añadir infraestructura adicional solo por necesidad demostrada.

### XV. Definition of Done

Una feature está terminada cuando:

- cumple todos los acceptance scenarios de la spec;
- plan y tareas son coherentes;
- tests/typecheck/lint pasan;
- migraciones aplican desde cero;
- no hay secretos expuestos;
- UI tiene estados loading/empty/error cuando aplica;
- documentación operativa mínima está actualizada;
- `/speckit.analyze` no tiene inconsistencias críticas;
- `/speckit.converge` no encuentra trabajo crítico pendiente.

## Governance

La constitución es la autoridad superior del proyecto y prevalece sobre cualquier spec,
decisión técnica o convención que la contradiga. Para enmendarla:

- Cualquier enmienda debe documentarse con motivo, alcance y estrategia de reversión.
- Una enmienda de tipo MAJOR (eliminación o redefinición de un principio) requiere
  aprobación explícita y un ADR que la justifique.
- Una enmienda de tipo MINOR (nuevo principio o sección) o PATCH (aclaración o wording)
  se registra en el Sync Impact Report con su justificación.
- Cualquier excepción a un principio MUST requiere un ADR explícito con motivo, alcance y
  estrategia de reversión; no se permite una excepción implícita.
- Toda feature, plan y PR debe verificar cumplimiento con la constitución; las violaciones
  injustificadas son bloqueantes.

**Version**: 1.0.0 | **Ratified**: 2026-09-04 | **Last Amended**: 2026-09-04
