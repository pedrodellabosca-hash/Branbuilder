# **DOCUMENTO 3**

## **OUTPUTS POR ETAPA · FORMATOS · VERSIONADO**

# **v1.0**

# **Este documento define todos los outputs que genera el sistema, su formato, reglas de versionado, almacenamiento y descarga.**  **Es vinculante para backend, frontend y lógica de negocio.**

# ---

## **1️⃣ Principios generales de outputs**

1. # **Todo output:** 

   * # **Está asociado a un proyecto** 

   * # **Pertenece a una etapa** 

   * # **Tiene versión** 

   * # **Puede ser regenerado** 

   * # **Nunca se pierde** 

2. # **El usuario:** 

   * # **Decide qué outputs conservar** 

   * # **Puede regenerar sin borrar historial** 

   * # **Puede descargar outputs parciales o finales** 

3. # **El sistema:** 

   * # **Versiona automáticamente** 

   * # **Mantiene trazabilidad** 

   * # **Garantiza coherencia entre etapas** 

# ---

## **2️⃣ Tipología de outputs**

### **2.1 Outputs textuales**

* # **Estrategia** 

* # **Naming** 

* # **Manifiesto** 

* # **Narrativa** 

* # **Claims** 

* # **Racionales** 

### **2.2 Outputs visuales**

* # **Logos** 

* # **Variantes** 

* # **Mockups** 

* # **Aplicaciones gráficas** 

### **2.3 Outputs compuestos**

* # **Brand Pack** 

* # **ZIP / PDF final** 

# ---

## **3️⃣ Outputs por etapa (detalle operativo)**

# ---

### **🔹 Etapa 1 – Contexto & Posicionamiento**

# **Outputs generados**

1. # **Resumen estratégico** 

2. # **Posicionamiento de marca** 

3. # **Tono y personalidad** 

# **Formato**

* # **Texto estructurado (JSON interno / Markdown renderizado)** 

* # **Visible en UI** 

* # **Editable solo mediante regeneración** 

# **Versionado**

* # **v1, v2, v3…** 

* # **Cada regeneración crea nueva versión** 

# ---

### **🔹 Etapa 2 – Naming Estratégico**

# **Outputs generados**

1. # **Lista de nombres (mínimo 5\)** 

2. # **Racional por nombre** 

# **Formato**

* # **Texto** 

* # **Cada nombre es una entidad independiente** 

# **Acciones permitidas**

* # **Marcar favoritos** 

* # **Seleccionar uno o más** 

* # **Regenerar lista completa** 

# **Versionado**

* # **Versionado por generación** 

* # **Se conserva historial completo** 

# ---

### **🔹 Etapa 3 – Manifiesto y Narrativa**

# **Outputs generados**

1. # **Manifiesto de marca** 

2. # **Narrativa extendida** 

3. # **Claim / tagline** 

# **Formato**

* # **Texto estructurado** 

* # **Preparado para exportar a PDF** 

# **Acciones**

* # **Regenerar** 

* # **Aprobar versión final** 

# ---

### **🔹 Etapa 4 – Identidad Visual (Logos)**

# **Outputs generados**

1. # **3 propuestas de logo** 

2. # **Variantes por propuesta:** 

   * # **Color** 

   * # **Blanco / negro** 

3. # **Mockups básicos** 

# **Formato**

* # **PNG / SVG** 

* # **Preview en UI** 

* # **Metadatos asociados (versión, propuesta, fecha)** 

# **Acciones**

* # **Ver en detalle** 

* # **Seleccionar una o varias** 

* # **Regenerar propuesta individual o completa** 

# **Versionado**

* # **Versionado por propuesta** 

* # **Historial accesible** 

# ---

### **🔹 Etapa 5 – Aplicaciones de Marca**

# **Outputs generados**

1. # **Papelería** 

2. # **Aplicación web o landing** 

3. # **Otras aplicaciones gráficas** 

# **Formato**

* # **Imágenes (PNG)** 

* # **Mockups visuales** 

* # **Agrupadas por tipo de aplicación** 

# **Acciones**

* # **Regenerar aplicación** 

* # **Seleccionar** 

* # **Aprobar** 

# ---

### **🔹 Etapa 6 – Cierre / Entrega**

# **Outputs generados**

1. # **Brand Pack Final** 

# **Contenido del Brand Pack**

* # **Estrategia** 

* # **Naming seleccionado** 

* # **Manifiesto** 

* # **Logos finales** 

* # **Aplicaciones seleccionadas** 

# **Formato**

* # **ZIP (estructura ordenada)** 

* # **PDF resumen (opcional dentro del ZIP)** 

# ---

## **4️⃣ Estructura del Brand Pack (ZIP)**

# **`/Brand_Pack/`**

# **`├── 01_Estrategia/`**

# **`│   └── estrategia.pdf`**

# **`├── 02_Naming/`**

# **`│   └── naming.pdf`**

# **`├── 03_Manifiesto/`**

# **`│   └── manifiesto.pdf`**

# **`├── 04_Logos/`**

# **`│   ├── logo_color.png`**

# **`│   ├── logo_bn.png`**

# **`│   └── variantes/`**

# **`├── 05_Aplicaciones/`**

# **`│   ├── papeleria.png`**

# **`│   └── web.png`**

# 

# ---

## **5️⃣ Reglas de selección y aprobación**

* # **Un output puede estar en estado:** 

  * # **Generado** 

  * # **Seleccionado** 

  * # **Aprobado** 

* # **Solo outputs aprobados entran en el Brand Pack final** 

* # **El usuario puede cambiar selecciones antes del cierre** 

# ---

## **6️⃣ Regeneración (regla crítica)**

* # **Regenerar:** 

  * # **NO borra outputs previos** 

  * # **Crea nueva versión** 

* # **El usuario puede:** 

  * # **Comparar versiones** 

  * # **Volver a una versión anterior** 

* # **El sistema nunca “sobrescribe”** 

# ---

## **7️⃣ Historial y trazabilidad**

# **Cada output guarda:**

* # **Etapa** 

* # **Versión** 

* # **Fecha** 

* # **Acción (generar / regenerar / aprobar)** 

* # **Usuario** 

# **Visible desde:**

* # **Historial del proyecto** 

* # **Vista de etapa** 

# ---

## **8️⃣ Descargas parciales**

# **El usuario puede descargar:**

* # **Outputs individuales** 

* # **Etapas completas** 

* # **Brand Pack final** 

# **Formatos:**

* # **Texto → PDF** 

* # **Visual → PNG / SVG** 

* # **Completo → ZIP** 

# ---

## **9️⃣ Reglas de integridad**

* # **No se puede cerrar un proyecto sin:** 

  * # **Al menos un naming seleccionado** 

  * # **Al menos un logo aprobado** 

* # **El sistema valida esto antes del cierre** 

# ---

## **🔟 Este documento es vinculante**

# **Este documento define:**

* # **Qué se genera** 

* # **Qué se guarda** 

* # **Qué se entrega** 

* # **En qué formato** 

* # **Con qué reglas** 

# **No se agregan outputs fuera de este esquema sin modificar este documento.**

# 

# 

# 