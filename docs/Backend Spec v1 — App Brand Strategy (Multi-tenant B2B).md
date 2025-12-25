**Backend Spec v1** lista para que desarrollo implemente sin “interpretar”.

---

# **Backend Spec v1 — App Brand Strategy (Multi-tenant B2B)**

## **1\) Objetivo del backend**

Backend único para una app B2B multi-tenant que permite a clientes:

* Crear y gestionar **Organizaciones**, **Usuarios**, **Proyectos** y **Marcas**  
* Completar un flujo por steps (inputs guardados y versionados)  
* Ejecutar **generaciones IA asíncronas** (“runs”) con progreso y reintentos  
* Guardar **documentos** y **assets** generados con versionado  
* Permitir **adjuntar** archivos del usuario al proyecto/marca  
* Permitir **seleccionar** una propuesta como “principal” y exportar un **ZIP final**  
* Registrar auditoría, consumo/usage (si aplica), y trazabilidad operativa

---

## **2\) Roles y permisos (RBAC)**

Roles por **organización** (workspace):

* **OWNER**  
  * Todo lo de ADMIN \+ billing/plan \+ configuración SSO (si aplica)  
* **ADMIN**  
  * Gestiona miembros, roles, proyectos, marcas, runs, exports  
* **EDITOR**  
  * Crea/edita proyectos y marcas, ejecuta runs, sube adjuntos, exporta  
* **VIEWER**  
  * Solo lectura (ver marcas, outputs, descargas si se permite)

Rol de plataforma (opcional, interno):

* **SUPER\_ADMIN** (operador dueño de la app)  
  * Ve todo y puede hacer soporte/diagnóstico

**Regla de oro:** todo recurso relevante tiene `organization_id` (directo o por relación) y siempre se valida pertenencia \+ rol.

---

## **3\) Entidades (modelo conceptual)**

### **Núcleo multi-tenant**

* Organization (workspace)  
* User  
* Membership (user ↔ organization \+ role)

### **Producto**

* Project (pertenece a Organization)  
* Brand (pertenece a Project)

### **Proceso (steps e inputs)**

* BrandInput (payload JSON \+ schema\_version)  
* BrandStep (step\_key \+ estado)

### **Generación IA**

* Run (un “intento” de generación)  
* RunTask (subtareas internas)

### **Outputs**

* Document (MD/PDF/DOCX)  
* Asset (PNG/SVG/HTML/etc.)  
* Export (ZIP final)

### **Archivos del usuario**

* Attachment (subidos por el usuario, asociados a project/brand)

### **Control**

* AuditLog  
* UsageLedger (si vendes por unidades/tokens)

---

## **4\) Estados (máquinas de estado)**

### **Brand**

* `DRAFT` → `IN_PROGRESS` → `READY_TO_GENERATE` → `READY` → `ARCHIVED`

### **Step**

* `LOCKED` | `OPEN` | `COMPLETED`

### **Run**

* `QUEUED` → `RUNNING` → `SUCCEEDED` | `FAILED` | `CANCELLED`

### **RunTask**

* `QUEUED` → `RUNNING` → `SUCCEEDED` | `FAILED` | `SKIPPED`

**Regla:** cada regeneración crea un **nuevo Run** y produce **nuevas versiones** de documentos/assets (no se pisa).

---

## **5\) Convención de versionado de outputs**

* Document/Asset tiene `version` numérica por `brand_id` \+ `type` (o por “pack”).  
* El front por defecto consume `latest_successful`.  
* Se mantiene historial completo y trazabilidad por `run_id`.

---

## **6\) Especificación de almacenamiento de archivos (Storage)**

Se recomienda storage S3-compatible con claves (keys):

* `org/{orgId}/project/{projectId}/attachments/{attachmentId}/{filename}`  
* `org/{orgId}/brand/{brandId}/documents/{docType}/v{version}.{ext}`  
* `org/{orgId}/brand/{brandId}/assets/{assetType}/v{version}/{filename}`  
* `org/{orgId}/brand/{brandId}/exports/{exportId}/brand_pack_v{version}.zip`

Descargas vía **URL pre-firmada** (expira, p.ej. 10–30 min).

---

## **7\) API REST — Contratos (endpoints)**

### **7.1 Auth**

**GET** `/auth/me`  
Devuelve usuario actual \+ memberships.

**POST** `/auth/logout`

El login puede ser con proveedor (Clerk/Auth0/Supabase) o propio. Si usas proveedor, estos endpoints se simplifican.

---

### **7.2 Organizations & Members**

**GET** `/organizations`  
Lista organizaciones donde el usuario es miembro.

**POST** `/organizations`  
Body:

{ "name": "Acme Studio" }

**GET** `/organizations/{orgId}/members` (ADMIN+)  
**POST** `/organizations/{orgId}/members/invite` (ADMIN+)  
Body:

{ "email": "user@acme.com", "role": "EDITOR" }

**PATCH** `/organizations/{orgId}/members/{memberId}` (ADMIN+)  
Body:

{ "role": "VIEWER" }

---

### **7.3 Projects**

**GET** `/projects?orgId=...`

**POST** `/projects` (EDITOR+)  
Body:

{ "orgId": "org\_123", "name": "Proyecto Q1", "description": "..." }

**GET** `/projects/{projectId}`

**PATCH** `/projects/{projectId}` (EDITOR+)

---

### **7.4 Brands**

**POST** `/projects/{projectId}/brands` (EDITOR+)  
Body:

{ "name": "Marca X", "type": "product|service|company" }

**GET** `/brands/{brandId}`  
Incluye estado, pasos, latest docs/assets (resumen).

**PATCH** `/brands/{brandId}` (EDITOR+)  
Permite:

* renombrar  
* archivar  
* setear “selected concept”

---

### **7.5 Brand Inputs (payload de pasos)**

**GET** `/brands/{brandId}/inputs`

**PUT** `/brands/{brandId}/inputs` (EDITOR+)  
Body:

{  
  "schemaVersion": "1.0",  
  "payload": { "positioning": { }, "personas": \[ \], "voice": { }, "visual": { } }  
}

**Regla:** siempre se guarda `updated_at`. (Si quieres historial de inputs, se crea tabla `brand_input_versions`).

---

### **7.6 Steps**

**GET** `/brands/{brandId}/steps`

**PATCH** `/brands/{brandId}/steps/{stepKey}` (EDITOR+)  
Body:

{ "state": "COMPLETED" }

**stepKey estándar (v1):**

* `project_setup`  
* `positioning`  
* `personas`  
* `offer`  
* `voice`  
* `visual`  
* `naming` (opcional)  
* `review`  
* `generate`  
* `deliver`

---

### **7.7 Uploads (Adjuntos usuario)**

**POST** `/uploads/presign` (EDITOR+)  
Body:

{ "orgId": "org\_123", "projectId": "proj\_1", "brandId": "brand\_1", "filename": "brief.pdf", "mime": "application/pdf" }

Response:

{ "uploadUrl": "...", "storageKey": "...", "attachmentId": "att\_1" }

**POST** `/uploads/complete` (EDITOR+)  
Body:

{ "attachmentId": "att\_1", "size": 123456 }

**GET** `/attachments?projectId=...`  
**PATCH** `/attachments/{attachmentId}` (asociar a brand, tags, etc.)

---

### **7.8 Runs (Generación IA)**

**POST** `/brands/{brandId}/runs` (EDITOR+)  
Body:

{  
  "runType": "full\_pack|logos\_only|landing\_only|docs\_only",  
  "options": {  
    "logos": 3,  
    "includeStationery": true,  
    "includeLanding": true,  
    "landingMode": "mockup|html",  
    "regenerate": false  
  }  
}

Response:

{ "runId": "run\_123", "status": "QUEUED" }

**GET** `/runs/{runId}`  
Response mínimo:

{  
  "runId": "run\_123",  
  "brandId": "brand\_1",  
  "status": "RUNNING",  
  "progress": { "pct": 42, "currentTask": "generate\_logos" },  
  "tasks": \[ { "taskKey": "voice", "status": "SUCCEEDED" }, ... \],  
  "startedAt": "...",  
  "finishedAt": null  
}

**GET** `/brands/{brandId}/runs`  
Historial.

**POST** `/runs/{runId}/cancel` (EDITOR+)

---

### **7.9 Documents**

**GET** `/brands/{brandId}/documents?type=manifesto|voice|visual|brandbook&latest=true`

**GET** `/documents/{documentId}`  
Metadata.

**GET** `/documents/{documentId}/download`  
Devuelve URL pre-firmada.

**Tipos de doc v1:**

* `strategy_summary`  
* `manifesto`  
* `voice_guide`  
* `visual_direction`  
* `naming_options`  
* `brandbook`  
* `logo_rationale` (por concepto)

---

### **7.10 Assets**

**GET** `/brands/{brandId}/assets?type=logo|stationery|landing&latest=true`

**PATCH** `/brands/{brandId}/selection` (EDITOR+)  
Body:

{ "selectedConcept": "01" }

**POST** `/brands/{brandId}/assets/regenerate` (EDITOR+)  
Body:

{ "type": "logos|landing|stationery|all", "reason": "Preferimos más minimalista" }

→ Internamente crea un nuevo run.

---

### **7.11 Export (ZIP)**

**POST** `/brands/{brandId}/exports` (EDITOR+)  
Body:

{ "mode": "latest|selected", "includeAlternatives": true }

Response:

{ "exportId": "exp\_1", "status": "QUEUED" }

**GET** `/exports/{exportId}`  
**GET** `/exports/{exportId}/download`

---

### **7.12 Audit & Usage (mínimo viable)**

**GET** `/audit?orgId=...` (ADMIN+)  
**GET** `/usage?orgId=...&period=2025-12` (OWNER/ADMIN)

---

## **8\) Jobs / Workers (orquestación asíncrona)**

### **Job principal**

* `orchestrate_run(runId)`

### **Orden sugerido para `runType=full_pack`**

1. `validate_inputs`  
2. `generate_strategy_summary` (si aplica)  
3. `generate_manifesto`  
4. `generate_voice_guide`  
5. `generate_visual_direction`  
6. `generate_logos` (3 conceptos)  
7. `generate_logo_rationale` (1 página por concepto)  
8. `generate_stationery` (por concepto)  
9. `generate_landing` (por concepto, modo mockup/html)  
10. `render_pdfs` (si MD→PDF)  
11. `build_brandbook_pdf`  
12. `build_export_zip` (opcional automático o bajo demanda)

### **Reintentos**

* Por tarea: 2 reintentos (exponencial)  
* Si falla una tarea no crítica (ej. landing), run puede terminar `SUCCEEDED_WITH_WARNINGS` (opcional) o `FAILED` (más simple v1: FAILED).

### **Progreso**

* `runs.progress_pct` actualizado por tareas completadas  
* `runs.current_task_key`

---

## **9\) Validaciones y reglas de negocio**

* No se puede disparar `full_pack` si steps obligatorios no están `COMPLETED`:  
  * positioning, personas, voice, visual, review  
* Un brand en `ARCHIVED` no permite runs nuevos  
* Selección de concepto:  
  * `selectedConcept` ∈ {01,02,03} solo si existen assets de esos conceptos en latest run exitoso  
* Adjuntos:  
  * se pueden asociar a proyecto o a marca  
  * un run puede recibir lista de `attachmentIds` para contextualizar generación

---

## **10\) Errores estándar (API)**

Formato:

{  
  "error": {  
    "code": "FORBIDDEN|NOT\_FOUND|VALIDATION\_ERROR|QUOTA\_EXCEEDED|RUN\_CONFLICT",  
    "message": "…",  
    "details": { }  
  }  
}

Errores típicos:

* `FORBIDDEN` (rol insuficiente / org mismatch)  
* `RUN_CONFLICT` (ya hay un run RUNNING para el brand y quieres limitar concurrencia)  
* `VALIDATION_ERROR` (inputs incompletos)  
* `QUOTA_EXCEEDED` (si hay límites)

---

## **11\) Observabilidad (mínimos no negociables)**

* `request_id` en cada request (propagado a logs)  
* `run_id` en logs de workers  
* logging estructurado con:  
  * orgId, userId, projectId, brandId, runId  
* métricas:  
  * runs por día, tasa de éxito, coste promedio, tiempos por tarea  
* trazas:  
  * opcional, pero recomendado si hay muchas tareas

---

## **12\) “Definition of Done” para backend v1**

Backend está listo cuando:

1. Un usuario crea org → proyecto → marca  
2. Completa inputs/steps  
3. Dispara `full_pack` y ve progreso  
4. Obtiene 3 conceptos de logo \+ papelería \+ landing \+ manifiesto \+ brandbook  
5. Puede regenerar solo logos (nuevo run \+ nueva versión)  
6. Puede seleccionar concepto principal  
7. Puede exportar ZIP (latest/selected)  
8. Descargas funcionan con URLs pre-firmadas  
9. RBAC y multi-tenant correctos (nadie ve datos ajenos)  
10. Logs y auditoría básica registran acciones clave

