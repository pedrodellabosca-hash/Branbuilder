# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- T1: Setup inicial del repositorio
  - Next.js 14 con App Router y TypeScript
  - Tailwind CSS configurado
  - ESLint configurado
  - Estructura de carpetas según arquitectura definida
  - docker-compose.yml para PostgreSQL local
  - .env.example con todas las variables necesarias
  - README.md ejecutable

- T2: Prisma + PostgreSQL + Schema inicial
  - Prisma configurado con PostgreSQL
  - Schema completo con todas las entidades core:
    - Organization, OrgMember (multi-tenant)
    - Project, ProjectMember, Stage
    - BrandCoreProfile
    - Output, OutputVersion (versionado)
    - Job (queue DB-based sin Redis)
    - LibraryFile
    - Comment, Notification, CommentReadReceipt (colaboración)
    - ApiKey (BYO keys cifradas)
    - PromptSet, WorkflowSet (registry)
    - AuditLog
    - UsageRecord (billing metering)

- T4: Clerk Auth + Organizations
  - Integración completa con Clerk
  - Páginas de sign-in y sign-up con diseño enterprise
  - OrganizationSwitcher integrado en dashboard
  - Webhook para sincronización de orgs y members
  - Middleware de protección de rutas
  - Dashboard con estadísticas de organización
  - Página "Nuevo Proyecto" con selector de módulos A/B

- Core UI v1 (T13 completo):
  - Página /projects con listado en grid
  - Empty state con CTA "Crear primer proyecto"
  - Página /projects/new con selector Módulo A/B
  - Página /projects/[id] con etapas por módulo
  - Redirect inteligente: / → /sign-in o /projects
  - Navegación sidebar con highlight de rutas activas
  - Multi-tenant estricto en todas las queries
  - API routes:
    - GET/POST /api/projects
    - GET/PATCH/DELETE /api/projects/[id]
    - POST/GET /api/org/sync (auto-sync org a DB)

- T3: Storage (S3-compatible) + Abstracción
  - StorageProvider interface (S3-compatible)
  - LocalStorageProvider para desarrollo (./storage)
  - Interfaz preparada para Cloudflare R2 en producción
  - API routes para archivos:
    - GET/POST /api/files
    - GET/DELETE /api/files/[id]
    - GET /api/files/[id]/download (stream)
  - UI componente ProjectFiles con drag-drop
  - Multi-tenant validado por orgId

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- Multi-tenant estricto implementado desde v0.1.0
- Permisos verificados en backend
- API keys nunca expuestas en frontend

---

## [0.1.0] - 2024-12-23

### Added
- Versión inicial del proyecto
- Setup completo de infraestructura base
