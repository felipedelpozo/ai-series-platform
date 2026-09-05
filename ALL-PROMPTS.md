# AI Series Platform — All prompts
## Constitution
/speckit.constitution

Crea la constitución de un proyecto NUEVO llamado provisionalmente "AI Series Platform". No reutilices ninguna constitución, spec, decisión arquitectónica ni compatibilidad con proyectos anteriores.

Principios no negociables:

1. SPEC-DRIVEN DEVELOPMENT
- La constitución es la autoridad superior.
- Cada cambio funcional relevante nace de una feature spec.
- `spec.md` describe QUÉ y POR QUÉ; las decisiones técnicas pertenecen a `plan.md`.
- Para features de producción se usa el ciclo: specify -> clarify -> checklist -> plan -> tasks -> analyze -> implement -> converge.
- No comenzar una feature posterior con gaps críticos abiertos en la anterior.

2. MONOREPO BUN-FIRST
- Un único repositorio y una única secuencia global de specs.
- Bun es runtime, package manager, workspace manager y test runner por defecto.
- Usar Bun workspaces y catalogs en el `package.json` raíz.
- Evitar Turborepo, pnpm, npm y yarn salvo una necesidad demostrada y documentada mediante ADR.
- TypeScript estricto en todo el monorepo.
- ESM por defecto.
- Las dependencias compartidas deben centralizar versiones mediante catalogs cuando sea práctico.

3. STACK MODERNO Y ACTUALIZABLE
- Resolver las últimas versiones estables y compatibles en el momento de implementar cada feature.
- Stack base obligatorio: Bun, TypeScript, Next.js App Router, React, Tailwind CSS v4+, shadcn/ui, Radix UI como base de primitives, AI SDK, Zod 4+, PostgreSQL y Drizzle ORM.
- Usar Next.js estable y con parches de seguridad; no usar una versión vulnerable por mantener un número antiguo.
- Usar `shadcn@latest` y reutilizar componentes/Blocks oficiales antes de construir equivalentes desde cero.
- No introducir dependencias grandes para problemas que el stack ya resuelve.
- Pre-releases están prohibidas salvo que una integración explícitamente las requiera; deben aislarse y documentarse.

4. SHADCN/RADIX Y CALIDAD DE INTERFAZ
- La interfaz debe construirse sobre shadcn/ui + Radix.
- Antes de crear una pantalla compleja, revisar si existe un shadcn Block reutilizable/adaptable.
- Tailwind se usa para styling; evitar CSS ad-hoc salvo casos justificados.
- Accesibilidad de teclado, focus visible, labels, estados disabled/loading/error y contraste son obligatorios.
- Desktop-first para el estudio de creación, responsive para resoluciones menores.
- La UI debe mostrar progreso real de operaciones largas, no loaders infinitos sin estado.

5. GENERACIÓN REAL DESDE EL PRINCIPIO
- fal.ai es el proveedor inicial obligatorio de generación de imagen y vídeo.
- No implementar providers falsos en desarrollo o producción.
- No usar imágenes/videos prefabricados para simular que una integración funciona.
- Las specs tempranas de imagen/vídeo deben incluir smoke tests live contra fal.ai.
- Las pruebas unitarias pueden mockear la red solo para probar ramas deterministas, errores o timeouts; nunca sustituyen el criterio de aceptación live.
- `FAL_KEY` es secreto de servidor y jamás se expone al navegador.
- Toda operación generativa larga debe usar APIs asíncronas/queue/webhook cuando corresponda.

6. PROMPTS COMO DATOS EDITABLES Y VERSIONADOS
- Ningún prompt de negocio significativo debe quedar como string inmutable escondido en servicios.
- Los prompts son entidades persistentes, tipadas, versionadas y editables desde la UI.
- Deben soportar defaults, overrides por serie/episodio/escena/shot, variables declaradas, validación, preview renderizado, clonación, rollback y activación de versión.
- Cada generación guarda un snapshot inmutable con prompt renderizado, versión de plantilla, variables, modelo, parámetros, referencias y resultado.
- Modificar un prompt nunca reescribe el histórico.
- Debe ser posible saber exactamente qué prompt generó cada asset.

7. DOMAIN-FIRST, PROVIDERS REEMPLAZABLES
- El dominio de serie, historia, episodios, escenas, shots, assets y decisiones no depende directamente de SDKs de proveedores.
- fal.ai, H3 Max Director, ComfyUI u otros proveedores se integran detrás de puertos/adapters tipados.
- ComfyUI es opcional y reemplazable; nunca una dependencia estructural del Story Engine o Episode Studio.
- Los adapters validan entradas/salidas con Zod y convierten errores externos a errores de dominio tipados.

8. HISTORIA Y CONTINUIDAD COMO FUENTE DE VERDAD
- El núcleo de la plataforma es StoryState + SeriesBible, no el fichero de vídeo.
- Cada episodio tiene estado narrativo antes/después.
- Personajes, localizaciones, props y referencias son entidades versionadas.
- Nunca depender únicamente del historial del LLM para continuidad.
- Las decisiones de audiencia deben producir cambios explícitos y trazables en StoryState.

9. TRABAJOS ASÍNCRONOS, IDEMPOTENCIA Y REINTENTOS
- Ningún request HTTP mantiene abierta la generación completa de un episodio.
- Jobs persistentes con estado, attempts, idempotency key, timestamps, provider request IDs, coste estimado/real cuando exista, errores y outputs.
- Reintentos controlados y operaciones idempotentes.
- Poder regenerar un shot fallido sin regenerar todo un episodio.
- Para MVP, preferir cola respaldada por PostgreSQL antes de añadir Redis/Kafka.

10. PERSISTENCIA Y MIGRACIONES
- PostgreSQL es la fuente de verdad.
- Drizzle define schema y migraciones.
- No hacer `push` destructivo en entornos compartidos.
- Cada cambio de schema debe tener migración reproducible.
- Constraints e índices importantes se expresan en base de datos, no solo en TypeScript.
- Zod valida los límites de entrada/salida; no duplicar manualmente tipos que puedan derivarse con seguridad.

11. OBSERVABILIDAD Y COSTE
- Cada request y job tiene correlation/request ID.
- Logging estructurado, sin secretos ni prompts sensibles completos en logs de producción.
- Medir duración, cola, proveedor, modelo, errores, attempts y coste por generación.
- Debe poder atribuirse coste a serie, episodio, escena y shot.
- Registrar suficiente información para reproducir un fallo sin registrar credenciales.

12. SEGURIDAD
- Secretos solo en servidor.
- Validar toda entrada no confiable con Zod.
- Proteger endpoints que puedan gastar créditos.
- Rate limiting/quotas cuando la plataforma sea multiusuario.
- Webhooks deben verificar autenticidad o aplicar la estrategia oficial del proveedor.
- Nunca interpolar contenido no confiable en SQL, shell o rutas de fichero.

13. TESTING CON PIRÁMIDE PRÁCTICA
- `bun test` para dominio y lógica.
- Integration tests reales para DB.
- E2E para journeys críticos del estudio.
- Smoke tests live explícitos para fal.ai.
- Los tests de pago no se ejecutan accidentalmente en cada save/PR; deben ser opt-in mediante script y secret.
- Una integración externa no se considera terminada hasta haber pasado al menos un smoke test real documentado.

14. SIMPLICIDAD Y VERTICAL SLICES
- Construir primero el loop mínimo completo, no veinte subsistemas incompletos.
- Preferir una implementación sencilla y observable antes que abstracciones prematuras.
- No crear microservicios. Monorepo modular con `apps/web`, `apps/worker` y paquetes compartidos.
- Añadir infraestructura adicional solo por necesidad demostrada.

15. DEFINITION OF DONE
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

Incluye una sección de governance que indique cómo se enmienda la constitución y que cualquier excepción a un MUST requiere un ADR explícito con motivo, alcance y estrategia de reversión.

## Base plan
/speckit.plan

Genera el plan técnico de la feature activa respetando estrictamente su spec y la constitución.

CONTEXTO TÉCNICO GLOBAL DEL PROYECTO

Proyecto nuevo, sin compatibilidad heredada.

Monorepo:
- Bun como runtime y package manager.
- Bun workspaces + catalogs.
- Sin Turborepo inicialmente.
- Estructura objetivo, ajustable solo con justificación:
  - apps/web: Next.js App Router; UI, server actions/route handlers cuando corresponda.
  - apps/worker: proceso Bun para jobs asíncronos.
  - packages/ui: shadcn/ui + Radix + Tailwind.
  - packages/db: Drizzle schema, client y migrations.
  - packages/domain: entidades/reglas puras del dominio.
  - packages/prompts: contratos de prompts, renderizado y versionado.
  - packages/generation: ports/orchestration de generación.
  - packages/fal: adapter fal.ai.
  - packages/media: assets/storage/composición.
  - packages/ai: AI SDK agents/structured generation cuando aplique.
  - packages/config: configuración y env validada con Zod.
  - packages/observability: logging/metrics/tracing internos.
- Los paquetes solo pueden depender en dirección coherente; domain no conoce Next.js, Drizzle ni fal.

Versiones:
- Resolver la última versión estable compatible en el momento de implementación usando Bun.
- Mantener `bun.lock`.
- Next.js: usar la última versión estable parcheada; a fecha 2026-09-04, 16.3.3 es Active LTS.
- Tailwind CSS v4.3+ / latest estable.
- shadcn CLI latest, base Radix.
- AI SDK v7+ / latest estable compatible.
- Zod v4+.
- PostgreSQL latest stable compatible.
- Drizzle ORM/Kit latest stable compatible. Si una funcionalidad imprescindible solo está en RC, documentarlo en ADR y aislar la dependencia.
- `@fal-ai/client` estable para queue/run/subscribe/storage.
- Para `minimax/h3-max/director` realtime, usar `@fal-ai/client@alpha` + `@fal-ai/server-proxy@alpha` únicamente en el adapter aislado si la documentación de fal sigue requiriéndolo al implementar.

UI:
- Next.js App Router + React Server Components por defecto.
- Client Components solo cuando existe interacción cliente real.
- Tailwind + shadcn/ui; reutilizar shadcn Blocks antes de construir layouts desde cero.
- Radix como base de primitives de shadcn.
- No crear un design system paralelo.

Datos:
- PostgreSQL + Drizzle.
- Migrations versionadas.
- UUID/ULID o ids consistentes definidos en plan.
- Timestamps en UTC.
- Soft delete solo donde exista necesidad de producto.
- JSONB únicamente para datos realmente variables; campos consultables importantes deben ser columnas tipadas.
- Zod en límites externos.

Jobs:
- apps/worker procesa jobs persistidos en PostgreSQL.
- Diseñar claiming seguro con locking/idempotency.
- No mantener requests HTTP abiertos durante generación de vídeo.
- Guardar providerRequestId, provider/model, status, attempts, timestamps, input snapshot, output, error y coste cuando esté disponible.

fal.ai:
- FAL_KEY solo servidor.
- No existe provider fake en dev/prod.
- Usar queue/webhooks para trabajo largo.
- Imagen default inicial: `fal-ai/nano-banana-2`.
- Edición/referencias: `fal-ai/nano-banana-2/edit` cuando sea apropiado.
- Vídeo inicial: `minimax/h3-max/image-to-video` y `minimax/h3-max/text-to-video`.
- Director realtime: `minimax/h3-max/director`.
- Los model IDs y parámetros deben ser configurables; no dispersarlos como strings por el código.
- Crear smoke tests `live` que realmente llamen a fal cuando `FAL_KEY` exista.
- Prohibido dar por completada la feature usando solo mocks.
- Unit tests pueden stubear red para error handling.

Prompts:
- Toda generación de negocio lee prompts persistentes/versionados.
- Entidad conceptual PromptTemplate + PromptVersion + PromptBinding/Override + GenerationPromptSnapshot.
- Cada prompt define propósito, plantilla, variables permitidas/obligatorias, output contract si aplica, provider/model defaults y parámetros editables permitidos.
- Antes de ejecutar debe poder renderizarse/previsualizarse.
- Cada job guarda prompt final renderizado + template/version + variables + parámetros.
- Overrides por workspace/serie/episodio/escena/shot donde tenga sentido.
- No esconder prompts importantes en código después de crear el Prompt Registry; los seeds iniciales también deben ser editables.

LLM:
- AI SDK v7 para generación estructurada/agentes cuando corresponda.
- Outputs estructurados validados con Zod.
- Mantener lógica determinista fuera del LLM.
- Separar planner, evaluator/QA y decision logic.

Testing:
- `bun test` como runner por defecto.
- Tests unitarios de dominio.
- Integration tests con PostgreSQL real.
- Playwright puede añadirse para E2E del navegador si la feature lo requiere.
- `test:live:fal` o scripts equivalentes para smoke real pagado.
- Tests live deben exigir explícitamente FAL_KEY y mostrar coste/endpoint aproximado cuando sea posible.

Calidad:
- TypeScript strict.
- No `any` no justificado.
- Errores tipados.
- Lint/format consistente.
- No dejar TODOs como sustituto de requirements.
- No silenciar errores de tipo.
- Documentar env vars nuevas en `.env.example`.

Para esta feature:
1. Extrae del `spec.md` únicamente las necesidades que le pertenecen.
2. Propón el cambio mínimo que complete la vertical slice.
3. Define data model, contratos, endpoints, componentes UI, jobs, tests y migraciones necesarios.
4. Indica explícitamente qué NO se implementa todavía.
5. Identifica riesgos de coste/latencia si llama a modelos.
6. Añade smoke/acceptance tests reales cuando la feature toque generación.
7. Si una decisión cruza límites arquitectónicos o introduce pre-release/nueva infraestructura, crea/propón ADR.

---

## Spec 001 — foundation-bun-monorepo

/speckit.specify

Crear desde cero la base ejecutable de la plataforma de series interactivas generadas con IA.

Qué debe conseguir:
- Un único repositorio organizado como monorepo.
- Una aplicación web inicial con una shell de producto profesional: navegación lateral, header, área principal y páginas placeholder claramente identificadas para Series, Assets, Prompts, Generations y Settings.
- Un proceso worker separado capaz de arrancar y exponer/registrar su estado de salud.
- Configuración de entorno validada al arranque.
- Comandos de desarrollo, build, typecheck, lint y test coherentes desde la raíz.
- Una página de diagnóstico visible solo en desarrollo que muestre qué subsistemas están configurados, sin revelar secretos.
- Diseño oscuro/claro coherente, accesible y preparado para un creator studio.
- La estructura debe permitir añadir paquetes de dominio, persistencia, generación y UI sin acoplarlos a la aplicación web.

Criterios de éxito:
- Un desarrollador clona, instala dependencias y levanta web + worker con instrucciones claras.
- Los workspaces comparten dependencias sin duplicación innecesaria.
- TypeScript strict funciona desde el principio.
- No hay código heredado ni dependencias de proyectos previos.
- No se añaden servicios que todavía no hagan falta.

---

## Spec 002 — postgres-drizzle-core

/speckit.specify

Añadir la persistencia base del producto y un modelo mínimo común para soportar las siguientes vertical slices.

Qué debe conseguir:
- Conectar la plataforma a una base PostgreSQL real.
- Tener migraciones reproducibles desde una base vacía.
- Introducir un "workspace" interno por defecto aunque todavía no exista autenticación, para evitar rehacer todas las relaciones al convertir el producto en multiusuario.
- Persistir registros de auditoría mínimos para cambios importantes.
- Proporcionar un health check de base de datos.
- Poder ejecutar tests de integración contra PostgreSQL real.
- Los datos no deben depender de estructuras internas de la UI.
- La aplicación debe fallar con un error accionable si la configuración de DB es inválida.

Criterios de éxito:
- Una base vacía puede migrarse completamente.
- La web y el worker pueden leer/escribir mediante una capa común.
- Existen tests reales de conexión/migración/operaciones base.
- Ningún secreto se imprime en logs o UI.

---

## Spec 003 — prompt-registry-studio

/speckit.specify

Crear el Prompt Registry y el primer Prompt Studio. Los prompts deben convertirse en objetos de producto editables y versionados antes de construir generación real.

Qué debe conseguir:
- Crear, editar, clonar, activar, archivar y versionar plantillas de prompt.
- Definir para cada plantilla un purpose/tipo, descripción, template, variables disponibles, variables requeridas, defaults y contrato de salida cuando aplique.
- Poder previsualizar el prompt final renderizado con un conjunto de variables antes de usarlo.
- Mantener historial de versiones y permitir volver a activar una versión anterior sin borrar las posteriores.
- Distinguir entre plantilla global por defecto y overrides vinculados a entidades del producto.
- Preparar scopes para workspace, serie, episodio, escena y shot.
- Crear una UI de Prompt Studio clara con listado, filtros por purpose, editor, variables y preview.
- Sembrar prompts iniciales mínimos para imagen de prueba y vídeo de prueba, pero esos seeds deben ser editables desde la UI.
- Crear un mecanismo para guardar un snapshot inmutable del prompt final usado por una ejecución futura.

Purposes iniciales que deben existir:
- `test.image`
- `test.video`
- `series.bible`
- `character.reference`
- `location.reference`
- `prop.reference`
- `reference.sheet`
- `story.state`
- `episode.plan`
- `scene.plan`
- `shot.plan`
- `image.generate`
- `video.generate`
- `video.direct`
- `audience.classify`
- `audience.decide`
- `qa.narrative`
- `qa.visual`
- `qa.continuity`
- `repair.regenerate`

Criterios de éxito:
- Ningún consumidor futuro necesita un string de prompt hardcoded para estos purposes.
- Editar una plantilla crea una nueva versión.
- El preview detecta variables faltantes.
- El histórico nunca cambia retroactivamente.

---

## Spec 004 — fal-real-image-generation

/speckit.specify

Construir la primera vertical slice de generación REAL: desde el Prompt Studio hasta una imagen generada externamente y visible en la plataforma.

Experiencia:
- Desde una pantalla "Generation Lab", el creador selecciona una plantilla de purpose `test.image` o `image.generate`.
- Puede editar/crear una nueva versión del prompt, proporcionar variables y ajustar parámetros permitidos.
- Puede iniciar la generación y ver estados reales: queued, running, succeeded o failed.
- Al finalizar ve la imagen real, request ID, modelo utilizado, duración y el prompt snapshot exacto que produjo el resultado.
- Puede volver a generar conservando o modificando prompt/parámetros.
- Un fallo muestra un mensaje útil y permite reintentar.

Requisitos:
- No puede existir una ruta de desarrollo que devuelva una imagen fake.
- El criterio de aceptación exige una generación live real con credenciales configuradas.
- La credencial del proveedor jamás se envía al navegador.
- Debe quedar preparado un smoke test manual/opt-in repetible y barato.
- Las imágenes generadas deben registrarse como assets aunque la biblioteca completa se construya después.
- La generación debe ser trazable al Prompt Registry.

Criterios de éxito:
- Con una cuenta válida y saldo disponible, el usuario genera una imagen real end-to-end desde la UI.
- El resultado persiste tras recargar.
- Se puede inspeccionar exactamente qué prompt y parámetros la generaron.

---

## Spec 005 — fal-real-video-generation

/speckit.specify

Extender Generation Lab con una vertical slice de vídeo REAL para validar H3 Max desde el inicio del proyecto.

Experiencia:
- El usuario puede generar vídeo desde texto y, cuando exista una imagen asset, iniciar image-to-video.
- Selecciona una plantilla `test.video` o `video.generate`, modifica variables/parámetros permitidos y ve el prompt final antes de enviar.
- La UI representa el trabajo asíncrono sin mantener una petición HTTP bloqueada.
- Debe mostrar progreso/estado disponible, request ID, modelo, duración, resultado, errores y botón de reintento.
- El vídeo final puede reproducirse en la propia app.
- El resultado queda vinculado al asset fuente cuando sea image-to-video.

Requisitos:
- No usar vídeo dummy ni provider mock como camino de desarrollo.
- La aceptación exige al menos un vídeo live generado realmente.
- La plataforma debe poder recuperar el resultado aunque el navegador se recargue mientras el job sigue en curso.
- Cada ejecución conserva prompt snapshot, variables, modelo y parámetros.
- El usuario puede regenerar con un prompt modificado sin perder la versión anterior.

Criterios de éxito:
- Flujo real: Prompt Studio -> submit -> procesamiento externo -> persistencia -> reproducción.
- Un refresh no pierde el job.
- Errores/reintentos quedan registrados.

---

## Spec 006 — media-asset-library

/speckit.specify

Crear una biblioteca de assets que sea la fuente de verdad para todo el material generado o subido.

Qué debe permitir:
- Listar, filtrar y abrir assets de imagen, vídeo y audio.
- Registrar origen: generado, subido o derivado.
- Guardar relaciones entre asset padre/hijo y generaciones que lo produjeron.
- Mostrar metadata útil: mime, dimensiones, duración, tamaño, provider/model, timestamps y entidades vinculadas.
- Descargar/copiar referencia interna y reutilizar un asset como input de otra generación.
- Marcar assets como approved, rejected, draft o locked.
- Eliminar de forma segura según las relaciones existentes.
- Mantener una referencia estable aunque la URL temporal del proveedor cambie.
- En desarrollo, asegurar persistencia local controlada; diseñar la interfaz para poder migrar a object storage sin modificar el dominio.

Criterios de éxito:
- Los outputs reales de las specs 004/005 aparecen automáticamente en la biblioteca.
- Un asset puede sobrevivir a una recarga y reutilizarse como input.
- Se puede rastrear su lineage hasta la generación y prompt snapshot.

---

## Spec 007 — generation-jobs-worker

/speckit.specify

Formalizar el sistema de jobs asíncronos que utilizará toda la generación de la plataforma.

Qué debe conseguir:
- Persistir jobs y attempts con estados claros.
- Claiming seguro por uno o varios workers.
- Idempotencia para evitar cobrar dos veces por el mismo submit accidental.
- Reintentos configurables para errores recuperables.
- Cancelación cuando el proveedor/estado lo permita.
- Recuperación tras reiniciar web o worker.
- Webhooks o polling del proveedor sin bloquear requests HTTP.
- Timeline de eventos por job.
- UI de Generations con filtros por estado/tipo/modelo y detalle de attempts.
- Asociar inputs, outputs, prompt snapshot, provider request ID, duración y costes/estimaciones cuando existan.
- Poder reanudar el worker sin duplicar resultados.

Criterios de éxito:
- Los flows reales de imagen y vídeo se migran a este sistema.
- Reiniciar el worker durante una generación no corrompe el job.
- Dos workers no procesan el mismo attempt simultáneamente.
- Se puede diagnosticar por qué falló una generación.

---

## Spec 008 — series-story-bible

/speckit.specify

Crear el modelo de Series y Series Bible como origen creativo estructurado de cada producción.

El creador debe poder:
- Crear, renombrar, duplicar, archivar y abrir una serie.
- Definir título, premisa, género, tono, público, formato, idioma, duración objetivo de episodios, reglas narrativas y estilo visual.
- Definir canon: hechos que nunca deben contradecirse.
- Definir límites/prohibiciones creativas.
- Guardar una descripción libre y también campos estructurados reutilizables por prompts.
- Generar una propuesta inicial de Bible con IA y editarla antes de aprobarla.
- Ver qué prompt/version produjo una propuesta generada.
- Mantener revisiones de la Bible sin alterar episodios ya producidos.

Criterios de éxito:
- La serie existe como entidad persistente independiente de cualquier vídeo.
- La Bible puede usarse como variables del Prompt Registry.
- Generar contenido con IA siempre produce un resultado editable, nunca lo aplica silenciosamente como canon.

---

## Spec 009 — characters-locations-props

/speckit.specify

Añadir el Asset Bible estructurado: personajes, localizaciones y props narrativos vinculados a una serie.

Para personajes:
- nombre, rol, edad aparente, apariencia, rasgos distintivos, vestuario, personalidad, voz/comportamiento, estado y reglas visuales.
Para localizaciones:
- descripción, zonas, iluminación, época, restricciones y reglas visuales.
Para props:
- descripción, material, escala, estado, propietario/ubicación y relevancia narrativa.

Requisitos:
- Entidades versionadas.
- Referencias aprobadas y bloqueables.
- Poder adjuntar assets existentes como referencia.
- Poder generar propuestas textuales con IA usando prompts editables y aprobarlas.
- Las referencias deben tener identificadores estables utilizables por scenes/shots.
- Cambiar una versión futura no puede reescribir el contexto usado por episodios pasados.

Criterios de éxito:
- Una serie puede definir y consultar su bible de referencias completa.
- Cada entidad sabe qué versión está activa y qué assets la representan.

---

## Spec 010 — reference-sheet-generation

/speckit.specify

Generar reference sheets REALES para personajes, localizaciones y props usando el sistema de prompts y generación ya construido.

Experiencia:
- Desde cada entidad, el creador abre "Generate reference sheet".
- Selecciona/edita la plantilla `reference.sheet`.
- Ve las variables resueltas desde la entidad y Series Bible.
- Puede elegir panels/poses/vistas y parámetros.
- Genera una o varias imágenes reales.
- Puede aprobar una sheet, rechazarla, regenerar una parte o promover imágenes a referencias oficiales.
- La sheet debe mantenerse vinculada a la versión exacta del personaje/localización/prop.

Reglas:
- Sin mocks como criterio de aceptación.
- Las referencias generadas deben poder alimentar generaciones posteriores.
- Guardar lineage completo y prompt snapshot.
- El diseño debe favorecer consistencia visual, no solo una galería de imágenes sueltas.

Criterios de éxito:
- Crear una serie de prueba, un personaje y una reference sheet real end-to-end.
- La referencia aprobada puede seleccionarse posteriormente como input de un shot.

---

## Spec 011 — story-state-engine

/speckit.specify

Crear Story State como fuente de verdad de continuidad narrativa.

Debe representar como mínimo:
- episodio actual;
- estado/localización de personajes;
- relaciones y confianza;
- inventario/props relevantes;
- hechos ocurridos;
- objetivos activos;
- secretos conocidos/desconocidos;
- preguntas narrativas abiertas;
- decisiones previas de audiencia;
- consecuencias pendientes;
- reglas/canon de la serie aplicables.

Flujo:
- Cada episodio tiene StoryStateBefore y StoryStateAfter.
- Proponer cambios con IA es posible mediante prompt editable, pero los cambios se validan estructuralmente.
- El usuario puede inspeccionar un diff antes de aprobar cambios importantes.
- Mantener histórico por episodio.
- No depender del chat history del modelo como memoria.
- Debe impedir o señalar transiciones claramente incompatibles con canon.

Criterios de éxito:
- Se puede reconstruir la evolución de la historia sin leer los vídeos.
- Un estado pasado es inmutable.
- El siguiente planner recibe un snapshot explícito y versionado.

---

## Spec 012 — episode-planner

/speckit.specify

Crear el Episode Planner que convierte Series Bible + StoryStateBefore + decisión de audiencia opcional en un plan de episodio estructurado y editable.

El plan debe incluir:
- hook inicial;
- objetivo dramático;
- beats principales;
- duración objetivo;
- personajes/localizaciones/props implicados;
- información que se revela;
- continuidad requerida;
- cierre/cliffhanger;
- pregunta/decisión que puede plantearse a la audiencia;
- StoryStateAfter propuesto.

Experiencia:
- Generar plan con IA usando `episode.plan`.
- Inspeccionar el prompt renderizado antes de ejecutar.
- Editar plan manualmente.
- Regenerar secciones sin destruir las demás.
- Aprobar una versión concreta como base de producción.
- Comparar versiones.
- No crear vídeo todavía desde este flujo si el plan no está aprobado.

Criterios de éxito:
- Los outputs son estructurados/validados.
- Un plan inválido o que contradice reglas se marca y no se aprueba silenciosamente.
- Cada propuesta conserva trazabilidad a prompt/modelo.

---

## Spec 013 — scene-shot-planner

/speckit.specify

Transformar un Episode Plan aprobado en escenas y shots cinematográficos explícitos.

Cada escena:
- propósito narrativo;
- localización;
- personajes/props;
- acción;
- diálogo/voz;
- duración estimada;
- continuidad de entrada/salida.

Cada shot:
- orden;
- duración;
- tipo de plano;
- sujeto;
- acción;
- composición;
- cámara/movimiento;
- lente/encuadre conceptual;
- iluminación;
- emoción;
- references requeridas;
- prompt de imagen si aplica;
- prompt de vídeo/dirección;
- restricciones de continuidad;
- estado editable/approved/locked.

Experiencia:
- IA genera propuesta usando prompts `scene.plan` y `shot.plan`.
- Todo es editable.
- Se puede regenerar una única escena o shot.
- Reordenar shots.
- El sistema calcula duración total aproximada.
- El usuario puede bloquear campos que no deben cambiar en regeneraciones.

Criterios de éxito:
- Un episodio aprobado produce un shot list listo para generación.
- No se requiere interpretar prosa libre para saber qué generar en cada shot.

---

## Spec 014 — episode-generation-graph

/speckit.specify

Construir el Generation Graph que convierte un shot list aprobado en assets reales y finalmente en material utilizable por el Episode Studio.

Para cada shot:
- Resolver referencias aprobadas.
- Crear/obtener keyframe o imagen de entrada cuando se necesite.
- Generar vídeo real con el modelo configurado.
- Registrar cada step como job independiente y trazable.
- Permitir dependencias entre steps.
- Reutilizar outputs válidos al reintentar.
- Si un shot falla, regenerar solo ese fragmento.
- Permitir cambiar el prompt de una etapa antes de reejecutarla.
- Mostrar progreso del episodio: pending/running/needs-review/approved/failed.

Requisitos:
- No implementar un "generate episode" monolítico.
- No usar mock media para pasar aceptación.
- Guardar snapshots de prompt para cada step.
- El usuario debe poder inspeccionar qué inputs y referencias llegaron al modelo.

Criterios de éxito:
- Serie de prueba -> episodio -> escenas/shots -> al menos dos shots generados realmente.
- Un fallo en el segundo shot no obliga a volver a pagar/generar el primero.

---

## Spec 015 — h3-max-director

/speckit.specify

Añadir soporte específico para dirección continua con H3 Max Director como capacidad avanzada de generación de vídeo, sin acoplar el dominio a su API.

Experiencia:
- Un usuario puede abrir una sesión de dirección para un shot/escena compatible.
- Configura prompt inicial, aspect ratio, resolución y memoria permitida.
- Puede enviar cambios de dirección/prompts durante la sesión y ver qué prompt_version está activa.
- El stream recibido se previsualiza y los segmentos útiles pueden guardarse como assets.
- Cada cambio de prompt se registra y queda vinculado temporalmente al output correspondiente.
- La sesión tiene estados claros y puede detenerse.
- Los errores de conexión/realtime son recuperables y visibles.

Reglas:
- Mantener credenciales en servidor/proxy seguro.
- La UI no conoce detalles internos del proveedor más allá de capacidades.
- Si la API requiere cliente/proxy alpha, aislarlo en el adapter.
- No hacer que el resto del Episode Generation dependa de realtime; debe seguir funcionando con generación asíncrona estándar.

Criterios de éxito:
- Una sesión real puede iniciarse y recibir vídeo.
- Cambiar el prompt produce una nueva versión trazable.
- Desactivar este adapter no rompe el motor de historia ni el estudio.

---

## Spec 016 — comfy-workflow-adapter

/speckit.specify

Añadir ComfyUI como motor opcional de workflows visuales avanzados, manteniéndolo reemplazable.

Casos iniciales:
- preparar una imagen de referencia;
- ejecutar un workflow versionado;
- recoger outputs y logs;
- usar el resultado como input de un job posterior.

El producto debe permitir:
- registrar workflows con nombre, versión y parámetros expuestos;
- mapear inputs del dominio a parámetros del workflow;
- ejecutar y monitorizar workflows;
- guardar outputs en Asset Library;
- elegir entre workflow ComfyUI o camino directo de generación cuando ambos sean compatibles;
- detectar workflow incompatible o servidor no disponible sin romper el resto.

Reglas:
- Story Engine, Episode Planner y Episode Studio no importan código de Comfy.
- No usar ComfyUI para esconder prompts no editables: cualquier texto creativo relevante sigue procediendo de Prompt Registry.
- Los workflows se versionan.
- Si Comfy no está configurado, la plataforma debe seguir siendo funcional con fal.ai.

Criterios de éxito:
- Ejecutar al menos un workflow real de prueba si COMFY está configurado.
- Poder apagar la integración sin migrar entidades de dominio.

---

## Spec 017 — episode-studio

/speckit.specify

Crear el Episode Studio principal para revisar y dirigir la producción de un episodio.

Layout orientativo:
- navegación/árbol de escenas y shots;
- canvas/preview central;
- inspector derecho;
- tabs o paneles para Story, Scenes, Shots, Assets, Prompts, Generation y QA.

Capacidades:
- seleccionar escena/shot y reproducir/ver assets;
- editar campos del shot;
- editar o crear override del prompt de CADA etapa aplicable;
- ver template original, versión, variables y prompt final renderizado;
- cambiar modelo/parámetros permitidos;
- reemplazar referencias;
- regenerar una etapa concreta;
- aprobar/rechazar/lockear outputs;
- ver lineage y job history;
- comparar regeneraciones;
- mostrar estado global del episodio.

Regla esencial:
- El creador nunca debe estar obligado a ir al código para modificar un prompt de generación.
- Los overrides no destruyen defaults; quedan versionados y scoped.
- Debe quedar claro qué prompts son globales y cuáles son overrides del episodio/escena/shot.

Criterios de éxito:
- Un creador puede corregir un shot defectuoso cambiando solo su prompt de vídeo y regenerándolo desde el Studio.

---

## Spec 018 — continuity-and-qa

/speckit.specify

Añadir un pipeline de QA que detecte problemas antes de aprobar un episodio.

Checks iniciales:
- coherencia con Series Bible;
- contradicciones StoryState;
- personaje/localización/prop incorrecto;
- vestuario/rasgos visuales inconsistentes;
- objeto necesario ausente;
- duración fuera de objetivo;
- shot duplicado;
- output vacío/corrupto;
- relación de aspecto/formato incorrecto;
- cliffhanger/pregunta de audiencia ausente cuando se requiere.

Experiencia:
- QA produce findings con severidad, evidencia, target y propuesta de reparación.
- Findings automáticos nunca borran assets.
- El usuario puede aceptar, ignorar con motivo o reparar.
- Reparar puede generar un nuevo prompt/version override mediante `repair.regenerate`.
- Narrative/visual/continuity QA usan prompts editables y outputs estructurados cuando dependan de IA.
- Checks deterministas no deben delegarse a un LLM.

Criterios de éxito:
- Un episodio con una inconsistencia intencional es marcado.
- El usuario regenera solo el fragmento afectado.
- Queda historial del finding y su resolución.

---

## Spec 019 — audio-voice-sfx

/speckit.specify

Añadir la capa de audio necesaria para que un episodio pueda pasar de clips visuales a pieza publicable.

Capacidades:
- diálogo/voz por shot o escena;
- música ambiente cuando corresponda;
- efectos/SFX;
- volumen y timing básicos;
- reutilización de voz/referencias aprobadas;
- assets de audio en la biblioteca;
- jobs independientes para poder regenerar solo el audio;
- prompts/instrucciones de voz editables cuando el proveedor use texto;
- sincronización suficiente para composición posterior.

No construir una DAW completa.
El usuario debe poder previsualizar audio asociado al shot y reemplazarlo/regenerarlo.

Criterios de éxito:
- Al menos un episodio de prueba puede tener voz/SFX reproducibles y trazables.
- Cambiar una pista no obliga a regenerar el vídeo.

---

## Spec 020 — composition-export

/speckit.specify

Crear composición y exportación del episodio terminado a un archivo vertical listo para TikTok.

Debe permitir:
- ordenar clips aprobados según shot list;
- combinar vídeo + audio;
- transiciones básicas solo cuando estén definidas;
- normalizar formato;
- exportar 9:16 con preset de calidad;
- respetar duración objetivo;
- preview del resultado;
- generar thumbnail/poster;
- guardar el export como asset derivado con lineage;
- reexportar sin regenerar assets fuente.

No construir un editor NLE completo.

Criterios de éxito:
- Un episodio formado por varios clips y pistas de audio se exporta como un único MP4 reproducible.
- El asset final puede relacionarse con su episodio y sus componentes.

---

## Spec 021 — audience-signal-ingestion

/speckit.specify

Crear la capa de señales de audiencia sin depender todavía de publicación automática.

Entradas:
- importación manual/archivo de comentarios e interacciones;
- entrada manual de opciones/votos para pruebas;
- formato preparado para conectores de plataforma posteriores.

Debe:
- normalizar comentarios, likes/reacciones, replies y metadata disponible;
- deduplicar;
- detectar spam/entradas inválidas;
- conservar el raw source separado de la interpretación;
- asociar señales a serie/episodio/interaction window;
- permitir abrir/cerrar una ventana de decisión;
- visualizar volumen y distribución básica.

Criterios de éxito:
- Un episodio puede recibir un dataset realista de interacciones sin TikTok API.
- La información queda lista para el Decision Engine sin perder el original.

---

## Spec 022 — audience-decision-engine

/speckit.specify

Convertir señales de audiencia en una decisión narrativa estructurada, explicable y editable.

Pipeline conceptual:
- moderación/filtrado;
- detección de intención;
- clustering semántico;
- candidatos;
- scoring;
- decisión ganadora;
- alternativas y confianza.

Debe:
- manejar opciones explícitas y propuestas espontáneas de comentarios;
- ponderar señales según reglas configurables;
- impedir que spam/repetición simple domine;
- mostrar por qué se eligió una decisión;
- permitir revisión humana antes de aplicarla;
- usar prompts editables `audience.classify` y `audience.decide` donde intervenga IA;
- guardar outputs estructurados y snapshots;
- no modificar StoryState hasta aprobación.

Criterios de éxito:
- Un conjunto de comentarios ambiguos produce candidatos entendibles.
- El creador puede corregir/seleccionar otra decisión.
- La decisión aprobada queda trazable a señales y reglas.

---

## Spec 023 — branching-next-episode-loop

/speckit.specify

Cerrar el loop central del producto: Audience Decision -> StoryState -> siguiente episodio -> generación.

Debe:
- tomar una decisión aprobada;
- aplicar una transición explícita al StoryState;
- crear el siguiente Episode Draft;
- generar su plan;
- permitir revisión;
- producir scenes/shots;
- iniciar generation graph;
- preservar continuidad y referencias;
- mantener una línea temporal de decisiones por episodio;
- permitir crear una rama alternativa sin sobrescribir la canónica.

Criterio principal:
Desde una serie con episodio 1 finalizado y señales importadas, el usuario debe poder aprobar una decisión y llegar a un episodio 2 generado manteniendo personaje, mundo y continuidad.

Este es el acceptance test de negocio más importante del MVP.

---

## Spec 024 — tiktok-integration

/speckit.specify

Añadir integración progresiva con TikTok sin convertirla en bloqueo arquitectónico.

Fases dentro de la feature, según APIs/permisos realmente disponibles:
1. Vincular una cuenta mediante el mecanismo oficial.
2. Asociar un vídeo publicado externamente a un episodio.
3. Importar engagement permitido por la API.
4. Cuando las capacidades/permisos lo permitan, publicar/exportar desde la plataforma.
5. Automatizar apertura/cierre de interaction window solo si es robusto.

Requisitos:
- El producto sigue funcionando en modo manual si la API no da acceso a una capacidad.
- No usar scraping que viole términos para simular una API inexistente.
- Mostrar al usuario qué capacidades están conectadas y cuáles no.
- Tokens/credenciales seguros.
- Reintentos y rate-limit handling.
- Raw events/imports trazables.

Criterios de éxito:
- La integración disponible oficialmente aporta valor real sin romper el loop manual.

---

## Spec 025 — cost-observability-operations

/speckit.specify

Crear el panel operativo y de costes necesario para usar la plataforma de forma sostenible.

Debe permitir:
- coste por provider/model;
- coste por serie, episodio, escena y shot;
- duración de cola/generación;
- success/error/retry rate;
- jobs activos/atascados;
- consumo por tipo de generación;
- presupuesto/alertas simples;
- inspección de errores con correlation IDs;
- limpiar/reprocesar jobs seguros;
- detectar outputs huérfanos;
- registrar estimación antes de operaciones caras cuando sea posible.

La UI debe evitar exponer secretos o datos innecesariamente sensibles.

Criterios de éxito:
- El creador puede saber aproximadamente cuánto costó producir un episodio.
- Un operador puede localizar un job fallido desde el episodio hasta el attempt del proveedor.

---

## Spec 026 — accounts-workspaces

/speckit.specify

Convertir el producto validado en plataforma multiusuario sin rehacer el dominio existente.

Debe permitir:
- registro/login seguro;
- usuarios;
- workspaces;
- miembros y roles básicos owner/editor/viewer;
- aislamiento de datos por workspace;
- invitaciones;
- settings de workspace;
- ownership de series/assets/prompts/jobs;
- cuotas/rate limits preparadas para consumo de IA.

Migración:
- el workspace interno creado al principio debe convertirse de forma segura en un workspace real;
- no perder datos existentes.

Criterios de éxito:
- dos workspaces no pueden acceder a datos del otro;
- un editor puede crear/generar;
- un viewer solo consulta;
- endpoints que gastan créditos exigen autorización.
