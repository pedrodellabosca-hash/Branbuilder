# Assumptions (Supuestos)

Documento de supuestos mínimos donde la documentación era ambigua.
Según la Regla 0: "Si algo es ambiguo, NO inventes: crea un ASSUMPTIONS.md con supuestos mínimos y elige la opción más conservadora."

## 1. Autenticación y Usuarios

### 1.1 Idioma por defecto
- **Supuesto**: Español (ES) según Documento 01
- **Impacto**: Nuevos proyectos tienen idioma ES por defecto
- **Alternativa considerada**: Inglés (EN)

### 1.2 Plan por defecto para nuevas organizaciones
- **Supuesto**: BASIC
- **Impacto**: Límites iniciales: 5 proyectos, 3 seats, 1GB storage/proyecto
- **Alternativa considerada**: Trial temporal

### 1.3 Trial Period
- **Supuesto**: No implementado en v1, todos empiezan como BASIC
- **Impacto**: Sin período de prueba gratis
- **Alternativa considerada**: 14 días trial

## 2. Seguridad

### 2.1 MFA en v1
- **Supuesto**: Opcional por usuario, no obligatorio por org en setup inicial
- **Impacto**: Usuarios pueden usar la app sin MFA
- **Razón**: MFA obligatorio requiere políticas de org (T8)

### 2.2 SSO/SAML en v1
- **Supuesto**: Solo configuración UI preparada, sin implementación completa en T1-T4
- **Impacto**: SSO disponible solo para plan Pro y requiere configuración manual
- **Razón**: SSO es feature enterprise avanzada

### 2.3 Session Timeout
- **Supuesto**: Delegado a Clerk con sus defaults
- **Impacto**: Sessions se manejan según configuración de Clerk
- **Razón**: Clerk maneja sesiones de forma nativa

## 3. Permisos

### 3.1 Creación de proyectos por MEMBER
- **Supuesto**: MEMBERs NO pueden crear proyectos por defecto
- **Impacto**: Solo OWNER y ADMIN pueden crear proyectos
- **Referencia**: Doc 04B indica "Member - No crear proyectos (por defecto NO)"

### 3.2 Acceso a proyectos por Owner/Admin de Org
- **Supuesto**: OWNER y ADMIN tienen acceso automático a todos los proyectos
- **Impacto**: No necesitan ser asignados como ProjectMember
- **Razón**: Lógica de negocio enterprise estándar

## 4. Módulos

### 4.1 Etapas de Módulo A
- **Supuesto**: 6 etapas según Doc 02 (A1-A6)
- **Nombres**:
  - A1: Contexto & Posicionamiento
  - A2: Naming Estratégico
  - A3: Manifiesto & Narrativa
  - A4: Identidad Visual
  - A5: Aplicaciones de Marca
  - A6: Cierre / Entrega

### 4.2 Etapas de Módulo B
- **Supuesto**: 8 etapas según Doc 02 (B1-B8)
- **Nombres**:
  - B1: Briefing (PM)
  - B2: Consumer Insights
  - B3: Competitive Strategy
  - B4: CSO (Cascada de Elecciones)
  - B5: Brand Metrics
  - B6: Brand Narrative
  - B7: Integración PM + Verificación
  - B8: Entrega Strategy Pack

## 5. Storage

### 5.1 Límites de archivo
- **Supuesto**: Máximo 25MB por archivo según Doc 02
- **Impacto**: Frontend y backend validan este límite

### 5.2 Límites de storage por proyecto
- **Supuesto**: Según plan (Doc 02)
  - Basic: 1GB/proyecto
  - Mid: 5GB/proyecto
  - Pro: 20GB/proyecto

## 6. Job Queue

### 6.1 Implementación
- **Supuesto**: DB-based (sin Redis) para compatibilidad con Vercel
- **Impacto**: Tabla Job en PostgreSQL con polling
- **Alternativa considerada**: BullMQ + Redis

### 6.2 Reintentos
- **Supuesto**: 3 intentos máximo por job
- **Impacto**: Después de 3 fallos, job queda como FAILED

## 7. Billing

### 7.1 Markup de tokens (Managed AI)
- **Supuesto**: 4x costo del proveedor según Doc 06C
- **Impacto**: `precio_cliente = cost_provider_worst_case * 4`

### 7.2 BYO Mode pricing
- **Supuesto**: Plan base × 3.5 según Doc 06C
- **Impacto**: Sin cobro por tokens cuando BYO está activo

## 8. Outputs

### 8.1 Estados de output
- **Supuesto**: GENERATED → SELECTED → APPROVED (progresión lineal)
- **Impacto**: Un output debe ser seleccionado antes de aprobarse
- **Referencia**: Doc 03

### 8.2 Versionado
- **Supuesto**: Versión incremental (v1, v2, v3...)
- **Impacto**: Cada regeneración crea nueva versión, nunca se sobrescribe

---

## Revisión

Este documento debe ser revisado cuando:
1. Se implemente una feature que dependa de un supuesto
2. Se reciba clarificación del stakeholder
3. Se encuentre una ambigüedad nueva en la documentación

**Última actualización**: 2024-12-23
