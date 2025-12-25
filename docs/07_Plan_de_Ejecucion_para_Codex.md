**\# DOCUMENTO 7 — PLAN DE EJECUCIÓN PARA CODEX**  
**\#\# v1.0**

**\> Objetivo: convertir la documentación funcional en trabajo ejecutable sin interpretación.**  
**\> Formato: backlog por fases \+ tickets con criterios de aceptación (“Definition of Done”).**

**\---**

**\#\# 0\) Definiciones globales**

**\#\#\# 0.1 Principios de implementación**  
**\- Backend decide permisos, frontend solo refleja**  
**\- Multi-tenant estricto por organización**  
**\- Todo versionado (outputs, prompts, workflows)**  
**\- Auditoría de acciones críticas**  
**\- Errores humanos (no técnicos)**  
**\- Billing y seguridad enterprise desde v1**

**\#\#\# 0.2 Entornos**  
**\- Local**  
**\- Staging**  
**\- Production**

**\#\#\# 0.3 Definition of Done (DoD) por ticket**  
**Un ticket está “DONE” solo si:**  
**\- Código implementado \+ lint/typecheck OK**  
**\- Tests mínimos (unit o integration según ticket)**  
**\- Validación de permisos incluida**  
**\- Manejo de errores alineado a Doc 5**  
**\- Logs/audit cuando aplique**  
**\- UI básica conectada y funcional**  
**\- Documentación breve (README o comentario en el módulo)**

**\---**

**\#\# FASE 1 — Setup del repositorio y cimientos**

**\#\#\# T1 — Repo \+ monorepo o estructura**  
**\- Crear proyecto Next.js (TS)**  
**\- Crear backend API (Node TS) o API routes (si se decide)**  
**\- Configurar eslint/prettier**  
**\*\*Aceptación:\*\* build OK, lint OK, estructura base.**

**\#\#\# T2 — DB \+ Prisma \+ migraciones**  
**\- PostgreSQL**  
**\- Prisma schema inicial**  
**\- Migración inicial**  
**\*\*Aceptación:\*\* \`prisma migrate\` OK, tablas base creadas.**

**\#\#\# T3 — Storage (S3 compatible) \+ abstracción**  
**\- Crear módulo StorageService**  
**\- Soportar upload/download presigned**  
**\*\*Aceptación:\*\* subir y listar archivos (dummy) funciona local.**

**\---**

**\#\# FASE 2 — Identidad y seguridad (Clerk \+ enterprise)**

**\#\#\# T4 — Integrar Clerk (auth base)**  
**\- Email/Password \+ verificación email**  
**\- Google \+ Apple login**  
**\*\*Aceptación:\*\* login/signup funcional, sesión persistente.**

**\#\#\# T5 — MFA (TOTP \+ backup codes)**  
**\- Pantalla Cuenta → Seguridad**  
**\- Activar/desactivar MFA (si políticas lo permiten)**  
**\*\*Aceptación:\*\* challenge MFA en login cuando activo.**

**\#\#\# T6 — Organizations en Clerk \+ contexto org activo**  
**\- Selector de organización**  
**\- Crear org**  
**\*\*Aceptación:\*\* usuario puede pertenecer a múltiples orgs y cambiar org activa.**

**\#\#\# T7 — SSO/SAML por organización (plan Pro)**  
**\- UI Organización → SSO**  
**\- Configurar conexión SSO**  
**\- Política “SSO obligatorio”**  
**\*\*Aceptación:\*\* cuando SSO obligatorio, login se enruta a SSO.**

**\#\#\# T8 — Políticas de seguridad por organización**  
**\- MFA obligatorio**  
**\- Dominio permitido**  
**\- IP allowlist (MVP)**  
**\- Session timeout/inactivity (si se implementa en app layer)**  
**\*\*Aceptación:\*\* políticas bloquean accesos no válidos con mensajes humanos.**

**\#\#\# T9 — AuditLog (seguridad y administración)**  
**\- Registrar: logins (si audit extendido), cambios de MFA, cambios de políticas, cambios de roles**  
**\*\*Aceptación:\*\* admin org ve logs básicos.**

**\---**

**\#\# FASE 3 — Modelo de negocio: organización/proyectos/roles**

**\#\#\# T10 — Entidades core (DB)**  
**Implementar tablas/relaciones:**  
**\- Organization (app-level)**  
**\- Project**  
**\- ProjectMember**  
**\- Invitation (si no se delega a Clerk)**  
**\- ModuleConfig (A/B)**  
**\- BrandCoreProfile**  
**\*\*Aceptación:\*\* CRUD básico desde API.**

**\#\#\# T11 — Permisos (Org \+ Project)**  
**\- Middleware central de autorización**  
**\- Roles: Owner/AdminOrg/Member \+ ProjectOwner/Editor/Viewer**  
**\*\*Aceptación:\*\* endpoints protegidos, tests de permisos mínimos.**

**\#\#\# T12 — UI Organización**  
**\- Dashboard org**  
**\- Proyectos list**  
**\- Miembros list**  
**\- Invitaciones**  
**\*\*Aceptación:\*\* flujos completos: invitar → aceptar → asignar a proyecto.**

**\#\#\# T13 — UI Proyecto (Overview \+ módulos)**  
**\- Overview muestra módulos habilitados y progreso**  
**\- “Nuevo Proyecto” con selector de módulos A/B (obligatorio elegir 1+)**  
**\*\*Aceptación:\*\* creación de proyecto con módulo A/B o ambos.**

**\---**

**\#\# FASE 4 — Project Library (archivos) \+ límites por plan**

**\#\#\# T14 — Library backend**  
**\- Upload (max 25MB)**  
**\- List**  
**\- Delete**  
**\- Storage usage por proyecto**  
**\*\*Aceptación:\*\* enforcement de límites por plan.**

**\#\#\# T15 — Library UI**  
**\- Pantalla Library con drag\&drop**  
**\- Progreso**  
**\- Error states**  
**\*\*Aceptación:\*\* UX robusta (Doc 5).**

**\#\#\# T16 — Indexado opcional (RAG-ready)**  
**\- Dejar interfaz para “procesar” archivos**  
**\- Estado: processing/ready/error**  
**\*\*Aceptación:\*\* aunque no se implemente RAG completo, queda preparado.**

**\---**

**\#\# FASE 5 — Colaboración: comentarios, leído, notificaciones, soft-lock**

**\#\#\# T17 — Comments/Threads**  
**\- Comentarios por etapa (y opcional por output)**  
**\- Menciones @usuario**  
**\*\*Aceptación:\*\* threads visibles, menciones generan notificación.**

**\#\#\# T18 — Read receipts \+ estado no leído**  
**\- Marcar como leído**  
**\- “Pendiente”**  
**\*\*Aceptación:\*\* badges correctos por usuario.**

**\#\#\# T19 — Notifications**  
**\- Panel de notificaciones**  
**\- Filtros: menciones, no leído, por proyecto, por módulo**  
**\*\*Aceptación:\*\* notificaciones persistentes y accionables.**

**\#\#\# T20 — Soft-lock de etapa**  
**\- Al editar inputs de etapa: “X está editando”**  
**\- Timeout / release**  
**\*\*Aceptación:\*\* reduce pisadas sin bloquear lectura.**

**\---**

**\#\# FASE 6 — Motor de módulos y generación (A/B)**

**\#\#\# T21 — Module Engine base**  
**\- Definir etapas por módulo (A y B)**  
**\- Estado de etapa: not started/generated/approved**  
**\*\*Aceptación:\*\* navegación por etapas funciona sin IA (mock outputs).**

**\#\#\# T22 — Output Service \+ versionado**  
**\- OutputVersion (generated/edited)**  
**\- Regeneración con “feedback” adicional**  
**\- Seleccionar/aprobar**  
**\*\*Aceptación:\*\* historial completo y trazabilidad.**

**\#\#\# T23 — Editor manual de outputs**  
**\- WYSIWYG o markdown editor simple**  
**\- Guardar “manual edit version”**  
**\*\*Aceptación:\*\* versión manual coexistiendo con IA.**

**\#\#\# T24 — Integración IA (Managed: OpenAI)**  
**\- ProviderAdapter: texto \+ imagen**  
**\- 2–3 modelos internos**  
**\- Guardar metadatos provider/model**  
**\*\*Aceptación:\*\* generación real con manejo de errores.**

**\#\#\# T25 — BYO Provider/Keys**  
**\- UI para cargar keys por org**  
**\- Validación health check**  
**\- Guardado cifrado**  
**\*\*Aceptación:\*\* modo BYO funcional (sin exponer keys).**

**\#\#\# T26 — Módulo A (Creación de Marca)**  
**\- Etapas A1–A6**  
**\- Outputs por etapa**  
**\- 3 propuestas de logo \+ aplicaciones (mockups) \+ manifiesto asociado**  
**\*\*Aceptación:\*\* Brand Pack descargable.**

**\#\#\# T27 — Módulo B (Brand Strategy)**  
**\- Etapas B1–B8**  
**\- Strategy Pack descargable**  
**\- Integra Project Library \+ Brand Core Profile como insumos**  
**\*\*Aceptación:\*\* Strategy Pack consistente y versionado.**

**\---**

**\#\# FASE 7 — Billing & Plans (Stripe) \+ metering**

**\#\#\# T28 — Stripe Checkout \+ suscripciones por organización**  
**\- Productos/planes Basic/Mid/Pro**  
**\- Estado de suscripción en DB**  
**\*\*Aceptación:\*\* pagar → org activa, cancelar → gating.**

**\#\#\# T29 — Add-ons (seats/storage)**  
**\- Compra add-ons**  
**\- Enforcement de límites**  
**\*\*Aceptación:\*\* no se puede exceder sin add-on.**

**\#\#\# T30 — Metering tokens/imágenes (Managed)**  
**\- Medir tokens por generación**  
**\- Emitir meter events a Stripe (según diseño)**  
**\*\*Aceptación:\*\* usage visible en “Usage”.**

**\#\#\# T31 — Gating por pago fallido**  
**\- Modo limitado: lectura OK, generación bloqueada**  
**\*\*Aceptación:\*\* UX clara, sin pérdida de datos.**

**\---**

**\#\# FASE 8 — Prompt/Workflow Registry (admin)**

**\#\#\# T32 — PromptSet/WorkflowSet versionado**  
**\- Crear/activar/rollback**  
**\- Registrar versión usada en cada generación**  
**\*\*Aceptación:\*\* rollback funcional sin deploy.**

**\#\#\# T33 — UI Admin (Registry)**  
**\- Lista versiones**  
**\- Activar/rollback**  
**\- Audit de cambios**  
**\*\*Aceptación:\*\* control operativo real.**

**\---**

**\#\# FASE 9 — Manual de Marca (Doc 8\) \+ export final**

**\#\#\# T34 — Generador de Manual de Marca**  
**\- Construir manual PDF según Doc 8**  
**\- Export ZIP con estructura fija**  
**\*\*Aceptación:\*\* manual cumple checklist QA (Doc 8).**

**\#\#\# T35 — Descargas finales**  
**\- Brand Pack / Strategy Pack / Manual**  
**\- versionado en /meta**  
**\*\*Aceptación:\*\* export reproducible y trazable.**

**\---**

**\#\# FASE 10 — QA, hardening y lanzamiento**

**\#\#\# T36 — Test suite mínima**  
**\- Auth/policies**  
**\- Permisos**  
**\- Billing gating**  
**\- Upload limits**  
**\*\*Aceptación:\*\* tests pasan en CI.**

**\#\#\# T37 — Observabilidad**  
**\- Logs estructurados**  
**\- Alertas de errores críticos**  
**\*\*Aceptación:\*\* trazabilidad de fallos en staging.**

**\#\#\# T38 — Deploy staging \+ prod**  
**\- Secrets management**  
**\- Migraciones controladas**  
**\*\*Aceptación:\*\* deploy reproducible.**

**\#\#\# T39 — Beta cerrada**  
**\- 3–5 organizaciones reales**  
**\- checklist de feedback**  
**\*\*Aceptación:\*\* iteraciones y fixes priorizados.**

**\---**

**\#\# Priorización recomendada (para salir rápido)**  
**1\) FASE 1–3 (auth/org/proyectos/roles)**  
**2\) FASE 4–5 (library \+ colaboración)**  
**3\) FASE 6 (módulos con IA)**  
**4\) FASE 7 (billing)**  
**5\) FASE 9 (manual top)**  
**6\) FASE 8 (registry) \*puede ir antes si querés iterar prompts a menudo\***

