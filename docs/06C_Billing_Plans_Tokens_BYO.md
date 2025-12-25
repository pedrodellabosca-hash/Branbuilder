# **DOCUMENTO 06C**

## **BILLING \+ PLANES \+ TOKENS \+ BYO (STRIPE)**

# **v1.0**

### **1\) Objetivo**

# Implementar monetización v1:

* # Suscripción por **Organización** 

* # Planes: Basic / Mid / Pro 

* # Add-ons: seats y storage 

* # Consumo variable: tokens (Managed AI) con markup 

* # Modalidad BYO: el cliente usa su proveedor IA → plan 3.5× más caro 

# Stripe soporta usage-based billing con **meters** y **meter events** [docs.stripe.com+2docs.stripe.com+2](https://docs.stripe.com/billing/subscriptions/usage-based?utm_source=chatgpt.com) y la gestión por webhooks de suscripciones/pagos [docs.stripe.com+1](https://docs.stripe.com/billing/subscriptions/webhooks?utm_source=chatgpt.com).

# ---

## **2\) Dos modalidades comerciales**

### **A) Managed AI (por defecto)**

* # Tú provees IA (OpenAI) 

* # El cliente paga: 

  * # plan base \+ add-ons 

  * # **uso variable** (tokens/imágenes) \= (costo peor caso) × 4 

### **B) BYO Provider / BYO API Keys**

* # La organización agrega sus API keys (texto e imagen) 

* # El cliente paga: 

  * # plan base **×3.5** 

  * # **sin cobro por tokens** (ellos pagan al proveedor) 

* # Se mantiene metering interno para: 

  * # reporting 

  * # límites por abuso 

  * # troubleshooting (sin facturar) 

# ---

## **3\) Planes (contenido funcional)**

# Límites exactos se pueden ajustar luego, pero la estructura queda definida.

### **BASIC (por organización)**

* # 1 organización 

* # Módulos: Creación de Marca \+ Estrategia (ambos disponibles, con límites) 

* # Colaboración: comentarios \+ menciones \+ leído \+ notificaciones 

* # Project Library: 1 GB por proyecto 

* # Proyectos activos: límite moderado (ej. 5\) 

* # Seats incluidos: (ej. 3\) 

* # SSO/SAML: **no** (solo Pro) 

* # Prompt registry: básico (sin controles avanzados) 

### **MID**

* # Proyectos activos más altos (ej. 20\) 

* # Seats incluidos: (ej. 10\) 

* # Storage: 5 GB por proyecto 

* # Branching por clonación habilitado 

* # Audit logs: básico 

* # SSO/SAML: opcional add-on (si querés) o solo Pro 

### **PRO (enterprise)**

* # Proyectos activos altos (ej. 100 o “ilimitados razonables”) 

* # Seats incluidos: (ej. 25\) 

* # Storage: 20 GB por proyecto 

* # **SSO/SAML \+ políticas de org** (MFA obligatorio, SSO obligatorio, dominio, IP allowlist) 

* # Audit logs extendidos 

* # Prompt/workflow registry “completo” (activar/rollback/versiones) 

* # Webhooks/exports habilitados 

# ---

## **4\) Add-ons**

### **4.1 Seats extra**

* # Pack por asiento adicional (por mes) 

* # Reglas: 

  * # si excede seats incluidos → bloquear invitaciones hasta comprar o bajar miembros 

### **4.2 Storage extra**

* # Base por proyecto: 

  * # Basic: 1 GB 

  * # Mid: 5 GB 

  * # Pro: 20 GB 

* # Add-ons: 

  * # \+5 GB (pack) 

  * # \+20 GB (pack con \~30% descuento vs 4×(5GB)) 

# ---

## **5\) Tokens (pricing y metering) — Managed AI**

### **5.1 Qué se mide**

* # tokens de entrada 

* # tokens de salida 

* # (opcional) tokens embeddings/RAG 

* # imágenes generadas (conteo y/o “unidad” por tamaño/calidad) 

### **5.2 Fórmula de cobro**

* # `cost_provider_worst_case` (tabla interna por modelo) 

* # `precio_cliente = cost_provider_worst_case * 4` 

* # Se factura por período (mensual) como “uso” 

# Stripe permite registrar uso con meters y meter events. [docs.stripe.com+2docs.stripe.com+2](https://docs.stripe.com/billing/subscriptions/usage-based/meters/configure?utm_source=chatgpt.com)

# ---

## **6\) Implementación Stripe (arquitectura)**

### **6.1 Productos / precios**

* # Producto “App Subscription” con 3 precios: Basic/Mid/Pro 

* # Producto “Seat Add-on” 

* # Producto “Storage Add-on (+5GB, \+20GB)” 

* # Producto “Token Usage” (Managed AI) con **meter** 

### **6.2 Meters**

* # `meter.tokens_text` (sum) 

* # `meter.images_generated` (sum) 

* # (opcional) `meter.tokens_embeddings` (sum) 

# Stripe: meter events representan acciones de uso, agregadas por el meter. [docs.stripe.com+1](https://docs.stripe.com/api/billing/meter-event?utm_source=chatgpt.com)

### **6.3 Webhooks mínimos obligatorios**

* # `checkout.session.completed` 

* # `customer.subscription.created/updated/deleted` [docs.stripe.com+1](https://docs.stripe.com/billing/subscriptions/webhooks?utm_source=chatgpt.com) 

* # `invoice.paid` 

* # `invoice.payment_failed` [docs.stripe.com+1](https://docs.stripe.com/billing/subscriptions/overview?utm_source=chatgpt.com) 

### **6.4 Reglas de acceso (gating)**

* # Si `invoice.payment_failed` o suscripción no activa: 

  * # app entra en modo “read-only” o “billing required” 

* # No se pierde información. 

# ---

## **7\) BYO Keys (modo BYO)**

* # Organización configura: 

  * # Proveedor texto \+ API key 

  * # Proveedor imagen \+ API key 

* # Seguridad: 

  * # cifrado server-side 

  * # auditoría 

  * # rotación/revocación 

* # Billing: 

  * # plan ×3.5 

  * # sin cargo tokens 

* # UX: 

  * # mostrar “modo BYO activo” 

  * # health check: “key válida / inválida” 

# ---

## **8\) Pantallas mínimas a agregar (impacto Doc 2 v1.2)**

* # Organización → Plan & Billing 

* # Organización → Usage (tokens/imágenes) 

* # Organización → Add-ons (seats/storage) 

* # Checkout / Upgrade / Downgrade 

* # Estado de pago fallido (bloqueo controlado)

# 