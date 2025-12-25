# **DOCUMENTO 06B**

## **SEGURIDAD ENTERPRISE \+ AUTH (CLERK)**

# **v1.0**

### **1\) Objetivo**

# Definir seguridad y autenticación **enterprise-grade** desde v1, incluyendo:

* # Email+Password \+ verificación de email 

* # Google \+ Apple login 

* # MFA (TOTP \+ backup codes) 

* # SSO/SAML (y OIDC) por organización 

* # Políticas de seguridad por organización y por usuario 

* # Auditoría de seguridad y eventos 

### **2\) Proveedor de identidad oficial**

# **Clerk** como Identity Provider (IdP) y gestor de sesiones.

# Clerk aporta:

* # Multi-tenant con **Organizations** \+ roles/permissions y “active organization context” [Clerk](https://clerk.com/docs/guides/organizations/overview?utm_source=chatgpt.com) 

* # Enterprise SSO por organización vía **SAML u OIDC** [Clerk+1](https://clerk.com/docs/guides/organizations/add-members/sso?utm_source=chatgpt.com) 

* # MFA (Authenticator/TOTP \+ backup codes; opcional SMS) [Clerk+1](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password-mfa?utm_source=chatgpt.com) 

### **3\) Niveles de seguridad (marco de control)**

# Usaremos **OWASP ASVS** como checklist verificable:

* # Objetivo base: **ASVS Level 2** (“la mayoría de apps”) 

* # Controles “L3” aplicados a módulos críticos: auth/sesiones/acceso/tenancy/audit [devguide.owasp.org+1](https://devguide.owasp.org/en/03-requirements/05-asvs/?utm_source=chatgpt.com) 

### **4\) Métodos de autenticación soportados (v1)**

1. # **Email \+ Password** 

2. # **Verificación de email** obligatoria (activar cuenta) 

3. # **Google Sign-In** 

4. # **Apple Sign-In** 

5. # **MFA**: TOTP \+ Backup Codes (habilitable por usuario u obligatorio por organización) [Clerk+1](https://clerk.com/docs/guides/development/custom-flows/authentication/email-password-mfa?utm_source=chatgpt.com) 

6. # **SSO Enterprise por organización**: 

   * # **SAML** (SP-initiated recomendado) [Clerk](https://clerk.com/docs/guides/configure/auth-strategies/enterprise-connections/authentication-flows?utm_source=chatgpt.com) 

   * # **OIDC** (cuando el IdP lo prefiera) [Clerk+1](https://clerk.com/docs/guides/organizations/add-members/sso?utm_source=chatgpt.com) 

### **5\) MFA explicado simple (para documentación interna y UX)**

# MFA \= “dos pruebas” para entrar:

* # algo que sabés: password 

* # algo que tenés: un código temporal (Authenticator/TOTP) o backup code 

# En Clerk se habilita TOTP y backup codes como estrategia de segundo factor. [Clerk+1](https://clerk.com/docs/guides/development/custom-flows/account-updates/manage-totp-based-mfa?utm_source=chatgpt.com)

### **6\) Políticas de seguridad configurables (enterprise)**

#### **6.1 A nivel USUARIO (self-service)**

# En **Cuenta → Seguridad**:

* # Activar/desactivar MFA (si la org no lo obliga) 

* # Ver/generar **backup codes** 

* # Ver sesiones activas y “cerrar sesión en todos los dispositivos” 

* # Cambiar password 

* # Preferencia de notificaciones de seguridad (inicio sesión nuevo) 

#### **6.2 A nivel ORGANIZACIÓN (políticas)**

# En **Organización → Seguridad** (solo Owner/Admin Org):

* # **MFA obligatorio** para todos los miembros 

* # **SSO obligatorio** (cuando exista conexión SSO configurada) 

* # Permitir/denegar métodos: 

  * # permitir Email+Password además de SSO (sí/no) 

  * # permitir Social (Google/Apple) (sí/no) 

* # Restricción por dominio (solo emails @empresa.com) 

* # **IP allowlist** (rangos permitidos) *(si se activa, bloquea fuera)* 

* # Timeouts: 

  * # expiración máxima de sesión 

  * # timeout por inactividad 

* # Nivel de auditoría: 

  * # básico (acciones críticas) 

  * # extendido (incluye login success/fail, cambios de políticas) 

# Nota: Clerk permite flujos de SSO por org; la UI debe reflejar si la org exige SSO/MFA. [Clerk+1](https://clerk.com/docs/guides/organizations/add-members/sso?utm_source=chatgpt.com)

### **7\) Aislamiento multi-tenant (regla de hierro)**

* # Toda petición backend debe resolver: 

  * # `organization_id` activo 

  * # rol en la organización / proyecto 

* # No existe acceso a recursos de otra org aunque el usuario pertenezca a varias. 

* # Los IDs nunca habilitan acceso por sí mismos (siempre permisos server-side). 

### **8\) Gestión de sesiones**

* # Sesión gestionada por Clerk (tokens/cookies según SDK) 

* # Reglas mínimas: 

  * # invalidación global al cambiar password o deshabilitar usuario 

  * # revocación inmediata al remover miembro de una org 

  * # protección CSRF según modo de sesión 

  * # refresh/rotación de sesión según configuración del proveedor 

### **9\) Seguridad de credenciales y secretos**

* # Secretos de plataforma (Clerk/Stripe/OpenAI) solo en servidor, vault/env seguro 

* # BYO keys: cifradas, “mostrar una sola vez”, rotación/revocación, audit trail 

### **10\) Auditoría de seguridad (mínimo enterprise)**

# Registrar (AuditLog):

* # logins exitosos/fallidos 

* # activación/desactivación MFA 

* # creación/actualización de conexión SSO 

* # cambios de políticas org 

* # revocación de sesiones 

* # cambios de roles y membresías 

### **11\) Eventos (para integraciones y monitoreo)**

# Emitir eventos internos:

* # `auth.login_succeeded`, `auth.login_failed` 

* # `auth.mfa_enabled/disabled` 

* # `auth.session_revoked` 

* # `sso.connection_created/updated` 

* # `security.policy_updated` 

* # `security.api_key_added/rotated/revoked` 

### **12\) Pantallas mínimas a agregar (impacto Doc 2 v1.2)**

* # Cuenta → Seguridad 

* # Organización → Seguridad 

* # Organización → SSO (configuración) 

* # Organización → Auditoría (logs)

# 