# Checklist de Implementación

## Fase 1: Setup del Repositorio y Cimientos

### T1 - Repo + Next.js + TS + Lint + Estructura + /docs
- [x] Crear estructura de proyecto Next.js 14 con App Router
- [x] Configurar TypeScript estricto
- [x] Configurar ESLint + Prettier
- [x] Crear estructura de carpetas según arquitectura
- [x] Copiar /docs con todos los documentos de especificación
- [x] Crear docker-compose.yml para PostgreSQL local
- [x] Crear .env.example con todas las variables
- [x] Crear README.md ejecutable

### T2 - Prisma + Postgres + Migración Inicial
- [x] Configurar Prisma con PostgreSQL
- [x] Crear schema inicial con entidades core
- [ ] Ejecutar migración inicial (requiere DB running)
- [x] Configurar scripts npm (db:migrate, db:seed, db:studio)

### T3 - Storage (S3-compatible) + Abstracción
- [x] Crear módulo StorageService (lib/storage/)
- [x] Implementación local con filesystem (LocalStorageProvider)
- [x] Interfaz preparada para Cloudflare R2 en prod
- [x] API routes: POST /api/files, GET /api/files, GET/DELETE /api/files/[id]
- [x] Download endpoint: GET /api/files/[id]/download
- [x] UI componente ProjectFiles con drag-drop, upload, download, delete
- [x] Multi-tenant con validación por orgId

### T4 - Clerk Auth Base + Organizations + Selector
- [x] Integrar Clerk SDK (Next.js)
- [x] Configurar Email+Password + verificación
- [x] Configurar Google + Apple login (en Clerk Dashboard)
- [x] Implementar Organizations de Clerk
- [x] Crear selector de organización
- [x] Crear pantalla "Nuevo Proyecto" con selector de módulos A/B
- [x] Webhook de Clerk para sincronización

## Fase 2: Identidad y Seguridad Enterprise
- [ ] T5 - MFA (TOTP + backup codes)
- [ ] T6 - Organizations contexto org activo
- [ ] T7 - SSO/SAML por organización (plan Pro)
- [ ] T8 - Políticas de seguridad por organización
- [ ] T9 - AuditLog

## Fase 3: Modelo de Negocio
- [ ] T10 - Entidades core (DB)
- [ ] T11 - Permisos (Org + Project)
- [ ] T12 - UI Organización
- [x] T13 - UI Proyecto (Overview + módulos)
  - [x] Página /projects con listado grid
  - [x] Empty state con CTA
  - [x] Página /projects/new con selector A/B
  - [x] Página /projects/[id] con etapas por módulo
  - [x] Multi-tenant queries (filtrado por orgId)
  - [x] API GET /api/projects (lista)
  - [x] API POST /api/projects (crear)
  - [x] API GET/PATCH/DELETE /api/projects/[id]
  - [x] API POST /api/org/sync (auto-sync org a DB)
  - [ ] Ejecución de etapas y generación (pendiente)

## Fase 4: Project Library
- [ ] T14 - Library backend
- [ ] T15 - Library UI
- [ ] T16 - Indexado opcional (RAG-ready)

## Fase 5: Colaboración
- [ ] T17 - Comments/Threads
- [ ] T18 - Read receipts
- [ ] T19 - Notifications
- [ ] T20 - Soft-lock de etapa

## Fase 6: Motor de Módulos y Generación
- [ ] T21 - Module Engine base
- [ ] T22 - Output Service + versionado
- [ ] T23 - Editor manual de outputs
- [ ] T24 - Integración IA (Managed: OpenAI)
- [ ] T25 - BYO Provider/Keys
- [ ] T26 - Módulo A (Creación de Marca)
- [ ] T27 - Módulo B (Brand Strategy)

## Fase 7: Billing & Plans (Stripe)
- [ ] T28 - Stripe Checkout + suscripciones
- [ ] T29 - Add-ons (seats/storage)
- [ ] T30 - Metering tokens/imágenes
- [ ] T31 - Gating por pago fallido

## Fase 8: Prompt/Workflow Registry
- [ ] T32 - PromptSet/WorkflowSet versionado
- [ ] T33 - UI Admin (Registry)

## Fase 9: Manual de Marca + Export
- [ ] T34 - Generador de Manual de Marca
- [ ] T35 - Descargas finales

## Fase 10: QA y Lanzamiento
- [ ] T36 - Test suite mínima
- [ ] T37 - Observabilidad
- [ ] T38 - Deploy staging + prod
- [ ] T39 - Beta cerrada
