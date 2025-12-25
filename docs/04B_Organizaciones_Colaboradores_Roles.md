# **DOCUMENTO 4B**

## **ORGANIZACIONES · COLABORADORES · ROLES**

# **v1.1**

# **Este documento extiende el modelo de usuarios del sistema incorporando organizaciones, colaboradores y roles por proyecto, sin romper la lógica definida previamente.**  **Es vinculante para frontend, backend y seguridad.**

# ---

## **1️⃣ Nuevo concepto central: Organización**

### **Definición**

# **Una organización representa una empresa, agencia o equipo que agrupa:**

* # **Usuarios (miembros / colaboradores)** 

* # **Proyectos** 

* # **Permisos compartidos** 

# **Todo proyecto pertenece siempre a una organización.**

# ---

## **2️⃣ Relación Usuario ↔ Organización**

* # **Un usuario puede:** 

  * # **Pertenecer a una o varias organizaciones** 

  * # **Tener roles distintos en cada una** 

* # **Un usuario no trabaja directamente sobre proyectos, sino a través de una organización** 

# ---

## **3️⃣ Relación Organización ↔ Proyectos**

* # **Una organización puede tener:** 

  * # **Uno o múltiples proyectos** 

* # **Cada proyecto:** 

  * # **Pertenece a una sola organización** 

  * # **Tiene colaboradores con roles específicos** 

# ---

## **4️⃣ Roles a nivel ORGANIZACIÓN**

# **Estos roles definen capacidades estructurales, no creativas.**

### **4.1 Roles definidos**

| Rol | Descripción |
| ----- | ----- |
| **Owner** | **Dueño de la organización** |
| **Admin Org** | **Administra usuarios y proyectos** |
| **Member** | **Miembro estándar** |

# ---

### **4.2 Permisos por rol (Organización)**

#### **🔹 Owner**

# **✔ Crear / eliminar organización**  **✔ Gestionar miembros**  **✔ Asignar roles organizacionales**  **✔ Crear proyectos**  **✔ Acceder a todos los proyectos**  **✔ Ver métricas**  **✔ (Futuro) Gestionar facturación**

# ---

#### **🔹 Admin Org**

# **✔ Invitar / remover usuarios**  **✔ Asignar roles de organización**  **✔ Crear proyectos**  **✔ Asignar colaboradores a proyectos**  **✔ Ver proyectos**

# **✖ Eliminar organización**  **✖ Gestionar facturación**

# ---

#### **🔹 Member**

# **✔ Acceder a proyectos asignados**  **✖ Gestionar usuarios**  **✖ Crear proyectos (opcional, por defecto NO)**

# ---

## **5️⃣ Roles a nivel PROYECTO**

# **Estos roles definen qué puede hacer un usuario dentro de un proyecto concreto.**

### **5.1 Roles definidos**

| Rol | Permisos |
| ----- | ----- |
| **Project Owner** | **Control total del proyecto** |
| **Editor** | **Generar y aprobar outputs** |
| **Viewer** | **Solo lectura** |

# ---

### **5.2 Permisos por rol (Proyecto)**

#### **🔹 Project Owner**

# **✔ Todo lo que puede un Editor**  **✔ Asignar / cambiar roles del proyecto**  **✔ Quitar colaboradores**  **✔ Cerrar proyecto**

# ---

#### **🔹 Editor**

# **✔ Ejecutar etapas**  **✔ Generar y regenerar outputs**  **✔ Seleccionar y aprobar outputs**

# **✖ Gestionar colaboradores**  **✖ Eliminar proyecto**

# ---

#### **🔹 Viewer**

# **✔ Ver outputs**  **✔ Descargar outputs**

# **✖ Generar**  **✖ Regenerar**  **✖ Aprobar**

# ---

## **6️⃣ Invitaciones a la organización**

### **Flujo de invitación**

1. # **Owner o Admin Org invita por email** 

2. # **El invitado recibe enlace** 

3. # **El usuario:** 

   * # **Acepta → se une a la organización** 

   * # **Rechaza → no se guarda acceso** 

4. # **El rol organizacional se asigna al aceptar** 

# ---

## **7️⃣ Asignación a proyectos**

* # **Un usuario no accede automáticamente a todos los proyectos** 

* # **Debe ser:** 

  * # **Asignado manualmente** 

  * # **Con un rol por proyecto** 

# **Un mismo usuario puede:**

* # **Ser Editor en Proyecto A** 

* # **Viewer en Proyecto B** 

* # **Project Owner en Proyecto C** 

# ---

## **8️⃣ Reglas críticas de seguridad**

1. # **Todo acceso valida:** 

   * # **Usuario** 

   * # **Organización** 

   * # **Rol organizacional** 

   * # **Rol de proyecto** 

2. # **El frontend nunca decide permisos** 

3. # **El backend es la única fuente de verdad** 

4. # **No existe acceso por URL directa** 

# ---

## **9️⃣ Casos especiales**

### **Usuario Owner**

* # **El Owner siempre tiene acceso a todos los proyectos** 

* # **Puede degradar su rol solo si hay otro Owner** 

# ---

### **Eliminación de usuario**

* # **Quitar usuario:** 

  * # **No borra proyectos** 

  * # **No borra outputs** 

* # **El acceso se revoca inmediatamente** 

# ---

## **🔟 Facturación (reservado para futuro)**

* # **El rol Owner queda reservado como:** 

  * # **Responsable de pagos** 

  * # **Titular de suscripción** 

* # **No se implementa en v1** 

* # **El modelo ya lo contempla** 

# ---

## **11️⃣ Límites explícitos (v1)**

# **En v1:**

* # **No hay colaboración en tiempo real** 

* # **No hay comentarios** 

* # **No hay edición simultánea** 

* # **No hay permisos personalizados** 

# **Todo lo anterior queda fuera de alcance.**

# ---

## **12️⃣ Este documento es vinculante**

# **Este documento define:**

* # **Modelo organizacional** 

* # **Colaboración** 

* # **Seguridad** 

* # **Escalabilidad B2B** 

# **No se implementan organizaciones ni colaboradores fuera de este esquema.**

# 

# 

# 