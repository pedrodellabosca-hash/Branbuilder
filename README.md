# BrandForge - Enterprise Brand Creation Platform

Plataforma B2B para crear y evolucionar marcas mediante procesos guiados y asistidos por IA, con colaboración por roles, versionado, auditoría y outputs profesionales.

## 🚀 Quick Start

### Requisitos
- Node.js 18+
- Docker (para PostgreSQL local)
- Una cuenta en [Clerk](https://clerk.com) (autenticación)
- Una cuenta en [Stripe](https://stripe.com) (billing, opcional para dev)

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Editar con tus credenciales
nano .env
```

**Variables mínimas requeridas para desarrollo:**
- `DATABASE_URL` - Ya configurado para Docker local
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Desde Clerk Dashboard
- `CLERK_SECRET_KEY` - Desde Clerk Dashboard

### 3. Iniciar PostgreSQL con Docker

```bash
docker-compose up -d
```

### 4. Ejecutar migraciones

```bash
npm run db:migrate
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000)

> **Nota**: Para ejecutar `npm run build` también necesitas tener las keys de Clerk configuradas, ya que Next.js prerenderiza algunas páginas durante el build.

---

## 📦 Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Genera el build de producción |
| `npm run start` | Inicia el servidor de producción |
| `npm run lint` | Ejecuta ESLint |
| `npm run type-check` | Verifica tipos TypeScript |
| `npm run db:migrate` | Ejecuta migraciones de Prisma |
| `npm run db:push` | Aplica el schema sin migraciones |
| `npm run db:studio` | Abre Prisma Studio (GUI) |
| `npm run db:seed` | Ejecuta seeds de datos |
| `npm run db:reset` | Resetea la base de datos |
| `npm run worker:start` | Inicia el worker de background |

---

## 🔧 Configuración de Clerk

### En el Dashboard de Clerk:

1. **Crear una aplicación**
   - Ve a [dashboard.clerk.com](https://dashboard.clerk.com)
   - Crea una nueva aplicación

2. **Habilitar métodos de autenticación**
   - Email + Password (con verificación)
   - Google OAuth
   - Apple OAuth (opcional)

3. **Habilitar Organizations**
   - Ve a "Organizations" en el menú
   - Activa las organizaciones

4. **Configurar el Webhook** (importante para sincronización)
   - Ve a "Webhooks"
   - Agrega un endpoint: `https://tu-dominio.com/api/webhooks/clerk`
   - Selecciona los eventos:
     - `organization.created`
     - `organization.updated`
     - `organization.deleted`
     - `organizationMembership.created`
     - `organizationMembership.updated`
     - `organizationMembership.deleted`
   - Copia el "Signing Secret" a `CLERK_WEBHOOK_SECRET`

5. **Copiar las API Keys**
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

---

## 💳 Configuración de Stripe (opcional para dev)

### En el Dashboard de Stripe:

1. **Crear productos y precios**
   - Producto "Basic Plan" → precio mensual
   - Producto "Mid Plan" → precio mensual
   - Producto "Pro Plan" → precio mensual
   - Add-ons: Seats, Storage

2. **Configurar el Webhook**
   - Endpoint: `https://tu-dominio.com/api/webhooks/stripe`
   - Eventos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`

3. **Copiar las API Keys**
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

---

## 🔄 Worker (Background Jobs)

El worker procesa tareas largas como generación de PDFs, batches de logos, etc.

### Ejecutar localmente:
```bash
npm run worker:start
```

### Variables de configuración:
- `WORKER_POLL_INTERVAL_MS` - Intervalo de polling (default: 5000ms)
- `WORKER_BATCH_SIZE` - Cantidad de jobs por batch (default: 5)

---

## 🏗️ Estructura del Proyecto

```
/brandforge
├── /app                    # Next.js App Router
│   ├── /api               # API Routes
│   ├── /(auth)            # Páginas de autenticación
│   └── /(dashboard)       # Dashboard (protegido)
├── /components            # Componentes React
├── /lib                   # Utilidades y servicios
│   ├── /db               # Prisma client
│   ├── /auth             # Helpers de Clerk
│   └── /utils.ts         # Funciones utilitarias
├── /prisma               # Schema y migraciones
├── /worker               # Background worker
├── /docs                 # Documentación de specs
└── /storage              # Storage local (desarrollo)
```

---

## 📚 Documentación

Los documentos de especificación se encuentran en `/docs`:
- Documento 01: Funcional Maestro
- Documento 02: Mapa de Pantallas y Flujos
- Documento 02B: User Journeys
- Documento 03: Outputs, Formatos, Versionado
- Documento 03B: Outputs Avanzados
- Documento 04B: Organizaciones, Colaboradores, Roles
- Documento 05: Estados, Errores, Edge Cases
- Documento 06: Stack Técnico
- Documento 06B: Seguridad Enterprise
- Documento 06C: Billing, Plans, BYO
- Documento 07: Plan de Ejecución
- Documento 08: Manual de Marca

---

## 🔐 Seguridad

- **Multi-tenant estricto**: Todas las queries filtran por `orgId`
- **Backend decide permisos**: El frontend solo refleja
- **BYO Keys cifradas**: Nunca expuestas en frontend
- **Audit Log**: Acciones críticas registradas

---

## 🚢 Deploy

### Vercel (Frontend + API)
```bash
vercel
```

### Base de datos: Neon Postgres
- Crear proyecto en [neon.tech](https://neon.tech)
- Copiar connection string a `DATABASE_URL`

### Storage: Cloudflare R2
- Crear bucket en Cloudflare
- Configurar variables R2_*

### Worker: Render
- Crear Background Worker en [render.com](https://render.com)
- Comando: `npm run worker:start`

---

## 📝 Changelog

Ver [CHANGELOG.md](./CHANGELOG.md)

---

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama: `git checkout -b feature/mi-feature`
3. Commit: `git commit -m "Txx: descripción"`
4. Push: `git push origin feature/mi-feature`
5. Abre un Pull Request

---

## 📄 Licencia

Propietario - Todos los derechos reservados
