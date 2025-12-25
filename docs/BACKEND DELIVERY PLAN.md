# **📦 BACKEND DELIVERY PLAN**

## **Checklist \+ Tickets (estilo Jira / Linear / ClickUp)**

Objetivo: construir el backend **listo para producción v1** sin rehacer nada luego.

---

## **🟦 SPRINT 0 — Setup & decisiones base (1–2 días)**

### **🎯 Objetivo**

Dejar el proyecto técnicamente preparado para desarrollar sin fricción.

### **Tickets**

**BE-00.1 — Definir stack y repositorio**

* Stack elegido: **Node.js \+ TypeScript**

* Framework API: **NestJS**

* DB: **PostgreSQL**

* ORM: **Prisma**

* Jobs: **BullMQ \+ Redis**

* Storage: **S3-compatible**

* Auth: **Clerk / Auth0 / Supabase Auth** (uno)

✅ DoD:

* Repo creado

* Entornos: local / staging

* `.env.example` documentado

---

**BE-00.2 — Infraestructura base**

* Provisionar:

  * PostgreSQL

  * Redis

  * Bucket S3

* Variables de entorno configuradas

✅ DoD:

* App levanta en local

* Conexión DB OK

* Healthcheck `/health` responde 200

---

## **🟦 SPRINT 1 — Auth, organizaciones y roles (Core multi-tenant)**

### **🎯 Objetivo**

Que el sistema sepa **quién es quién** y **a qué organización pertenece**.

### **Tickets**

**BE-01.1 — Auth y usuario**

* Endpoint `/auth/me`

* Modelo `User`

* Integración con proveedor de auth

✅ DoD:

* Usuario autenticado obtiene su info

* Token/session valida requests

---

**BE-01.2 — Organizations (Workspaces)**

* CRUD de organizaciones

* Relación user ↔ organization

Endpoints:

* `GET /organizations`

* `POST /organizations`

✅ DoD:

* Un usuario puede crear y listar sus organizaciones

* No ve organizaciones ajenas

---

**BE-01.3 — Memberships & Roles**

* Roles: OWNER, ADMIN, EDITOR, VIEWER

* Middleware de permisos

Endpoints:

* `GET /organizations/:id/members`

* `POST /organizations/:id/members/invite`

* `PATCH /organizations/:id/members/:memberId`

✅ DoD:

* Roles se respetan

* Un EDITOR no puede invitar usuarios

* OWNER/ADMIN sí

---

## **🟦 SPRINT 2 — Proyectos y marcas**

### **🎯 Objetivo**

Modelar la estructura real del producto.

### **Tickets**

**BE-02.1 — Projects**

* CRUD de proyectos

* Siempre ligados a una organización

Endpoints:

* `POST /projects`

* `GET /projects`

* `GET /projects/:id`

* `PATCH /projects/:id`

✅ DoD:

* Proyecto pertenece a una org

* Acceso validado por rol

---

**BE-02.2 — Brands**

* CRUD de marcas dentro de proyectos

* Estado de marca (`DRAFT`, `IN_PROGRESS`, etc.)

Endpoints:

* `POST /projects/:projectId/brands`

* `GET /brands/:id`

* `PATCH /brands/:id`

✅ DoD:

* Marca ligada a proyecto

* Marca hereda organización

* Marca puede archivarse

---

## **🟦 SPRINT 3 — Steps \+ Inputs (flujo del usuario)**

### **🎯 Objetivo**

Persistir **todo lo que el usuario completa en el proceso**.

### **Tickets**

**BE-03.1 — Brand Inputs**

* Tabla `brand_inputs`

* Guardar payload JSON \+ schema\_version

Endpoints:

* `GET /brands/:id/inputs`

* `PUT /brands/:id/inputs`

✅ DoD:

* Inputs se guardan

* Se sobrescriben correctamente

* Version de schema registrada

---

**BE-03.2 — Brand Steps**

* Tabla `brand_steps`

* Estados: LOCKED / OPEN / COMPLETED

Endpoints:

* `GET /brands/:id/steps`

* `PATCH /brands/:id/steps/:stepKey`

✅ DoD:

* Steps reflejan progreso real

* Backend valida qué pasos son obligatorios

---

## **🟦 SPRINT 4 — Uploads y adjuntos del usuario**

### **🎯 Objetivo**

Permitir que el usuario **suba briefs y referencias**.

### **Tickets**

**BE-04.1 — Presigned uploads**

* Generar URL pre-firmada

* Registrar attachment

Endpoints:

* `POST /uploads/presign`

* `POST /uploads/complete`

✅ DoD:

* Usuario sube archivo directo a S3

* Backend registra metadata

* Archivo queda asociado a project/brand

---

**BE-04.2 — Gestión de attachments**

* Listar adjuntos

* Asociar/desasociar a marcas

Endpoints:

* `GET /attachments`

* `PATCH /attachments/:id`

✅ DoD:

* Adjuntos reutilizables

* Permiten contextualizar runs

---

## **🟦 SPRINT 5 — Runs & Orquestación IA (el corazón)**

### **🎯 Objetivo**

Poder generar entregables **asíncronamente**, con progreso y control.

### **Tickets**

**BE-05.1 — Runs**

* Tabla `runs`

* Estados y progreso

Endpoints:

* `POST /brands/:id/runs`

* `GET /runs/:id`

* `GET /brands/:id/runs`

* `POST /runs/:id/cancel`

✅ DoD:

* Run se crea

* Estado cambia correctamente

* Cancelación funciona

---

**BE-05.2 — Run Tasks**

* Tabla `run_tasks`

* Tareas internas por run

✅ DoD:

* Cada run crea sus tasks

* Progreso se calcula por tasks completadas

---

**BE-05.3 — Worker & Queue**

* BullMQ

* Job `orchestrate_run(runId)`

* Logs por run/task

✅ DoD:

* Worker ejecuta tareas secuenciales

* Si una falla → run FAILED

* Logs claros con runId

---

## **🟦 SPRINT 6 — Documents & Assets (versionado real)**

### **🎯 Objetivo**

Guardar y servir **resultados generados** correctamente.

### **Tickets**

**BE-06.1 — Documents**

* Tabla `documents`

* Versionado por tipo

Endpoints:

* `GET /brands/:id/documents`

* `GET /documents/:id/download`

✅ DoD:

* Docs versionados

* Latest\_successful funciona

---

**BE-06.2 — Assets**

* Tabla `assets`

* Tipos: logo, stationery, landing

Endpoints:

* `GET /brands/:id/assets`

* `POST /brands/:id/assets/regenerate`

✅ DoD:

* Assets asociados a run

* Regenerar crea nuevo run \+ nueva versión

---

**BE-06.3 — Selección de concepto**

* Campo `selectedConcept` en Brand

Endpoint:

* `PATCH /brands/:id/selection`

✅ DoD:

* Solo se puede seleccionar concepto existente

* Se refleja en export

---

## **🟦 SPRINT 7 — Export ZIP (producto vendible)**

### **🎯 Objetivo**

Entregar el **pack final descargable**.

### **Tickets**

**BE-07.1 — Export entity**

* Tabla `exports`

* Estados: QUEUED / READY / FAILED

---

**BE-07.2 — Build ZIP**

* Job `build_export_zip(exportId)`

* Incluye:

  * docs

  * assets

  * selected concept

  * alternativos (si aplica)

Endpoints:

* `POST /brands/:id/exports`

* `GET /exports/:id`

* `GET /exports/:id/download`

✅ DoD:

* ZIP descargable

* Contenido correcto

* URLs pre-firmadas

---

## **🟦 SPRINT 8 — Auditoría, seguridad y cierre**

### **🎯 Objetivo**

Que el producto sea **operable en producción**.

### **Tickets**

**BE-08.1 — Audit log**

* Tabla `audit_logs`

* Registrar:

  * create/update/delete

  * runs

  * exports

  * roles

✅ DoD:

* Logs consultables por ADMIN

---

**BE-08.2 — Validaciones finales**

* Multi-tenant enforced

* Rate limit runs

* Manejo de errores estándar

---

## **🟦 SPRINT 9 — Hardening (opcional pero recomendado)**

* SSE/WebSocket para progreso

* Métricas (runs/día, success rate)

* Panel SUPER\_ADMIN (interno)

---

# **🧠 Cómo lo usas tú como founder (clave)**

Tú **no programas**, pero:

* Puedes revisar sprint por sprint

* Puedes validar DoD funcionales (“¿esto ya hace X?”)

* Puedes priorizar features

* Puedes vender con seguridad porque:  
   👉 el producto **está bien diseñado desde el backend**

