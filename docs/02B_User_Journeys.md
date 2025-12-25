# **DOCUMENTO 02B**

## **USER JOURNEYS (1 PÁGINA)**

# **v1.0**

### **Journey 1 — Nuevo usuario → primer proyecto (módulos)**

1. # Sign up (Email/Google/Apple) → verifica email si aplica 

2. # Crea Organización 

3. # “Nuevo Proyecto” → elige módulos: 

   * # Creación de marca / Estrategia / Ambos 

4. # Sube inputs (Business Plan \+ Buyer Personas \+ docs) a Project Library 

5. # Ejecuta Etapa 1 → genera output → comenta → aprueba → continúa 

# **Éxito:** proyecto creado, primer output aprobado, trazabilidad intacta.

# ---

### **Journey 2 — Colaboración (invitar \+ roles \+ debate)**

1. # Owner invita a miembro a la Organización 

2. # Miembro acepta → aparece en miembros 

3. # Owner lo asigna a Proyecto como Editor o Viewer 

4. # Editor genera/regenera outputs con “feedback de regeneración” 

5. # Viewer comenta/lee → marca como leído 

6. # Notificaciones y badge guían actividad 

# **Éxito:** colaboración con historial, sin “pisadas”, sin confusión.

# ---

### **Journey 3 — Seguridad enterprise (MFA \+ SSO)**

1. # Org Owner activa política “MFA obligatorio” 

2. # Usuarios configuran Authenticator \+ backup codes 

3. # Org Owner configura SSO (SAML) y activa “SSO obligatorio” 

4. # Miembros acceden por IdP corporativo 

# **Éxito:** acceso enterprise con control por organización.

# ---

### **Journey 4 — Billing (plan \+ add-ons \+ pago fallido)**

1. # Org Owner elige plan (Basic/Mid/Pro) y paga (Stripe Checkout) 

2. # Compra seats o storage add-on si necesita 

3. # Si `invoice.payment_failed` → app en modo limitado con CTA de pago 

4. # Al pagar → app vuelve a modo normal sin pérdida de datos 

# **Éxito:** monetización sin cortar operación ni perder información.

# ---

### **Journey 5 — BYO Provider**

1. # Org Owner cambia a modo BYO 

2. # Carga keys (texto/imagen) → validación 

3. # Uso se registra (reporting), pero no se factura tokens 

4. # Si key inválida → mensajes claros \+ fallback a Managed (si plan lo permite) 

# **Éxito:** agencias usan su proveedor sin fricción.

# ---

### **Journey 6 — Variantes (clonar proyecto)**

1. # Project Owner clona proyecto (Branch) 

2. # En el branch prueba otro naming/estilo/estrategia 

3. # Exporta Brand Pack del branch o “promueve” decisiones al proyecto principal (si se habilita) 

# **Éxito:** explorar alternativas sin romper lo aprobado.

# ---

### **Journey 7 — Admin del sistema (prompts/workflows)**

1. # Admin crea PromptSet v2 (staging) 

2. # Activa para nuevas generaciones 

3. # Si falla → rollback a v1 

4. # Audit log registra todo 

# **Éxito:** evolución del producto sin deploys urgentes y con rollback.

# 