# Practica_2

Aplicación full-stack para gestión de tickets por grupos: Angular 20 frontend con PrimeNG + microservicios Node/NestJS backend (Fastify + PostgreSQL/Supabase). Incluye navegación responsive, tablero Kanban, autenticación JWT, administración de permisos y control de cuentas activas/inactivas.

## Instalación rápida

```bash
# 1. Copiar configuración del entorno
cp .env.example .env
# Editar .env con credenciales locales (PostgreSQL, JWT_SECRET, URLs)

# 2. Instalar dependencias
npm install

# 3. Ejecutar stack completo (servicios + frontend dev)
.\start-stack.ps1
```

Acceder a: http://localhost:4200 (frontend) | http://localhost:3000 (API Gateway)

## Stack

**Frontend:**
- Angular 20 (`@angular/*` 20.3.x)
- PrimeNG 20.4.0
- TypeScript ~5.9.2

**Backend:**
- API Gateway: Fastify + rate limiting + JWT
- Microservicios: NestJS (user-service, group-service, ticket-service)
- Database: PostgreSQL (Supabase con SSL configurable)
- Authentication: JWT tokens + Bearer validation

**DevOps:**
- npm scripts para desarrollo local
- PowerShell stack orchestration (`start-stack.ps1`)
- Docker-ready (Dockerfile para cada servicio)

## Rutas Frontend

- `/landing` - Página de bienvenida
- `/login` - Autenticación
- `/register` - Registro de usuarios
- `/dashboard` - Panel principal con resumen de tickets por grupo
- `/group` - Gestión de grupos y tickets (Kanban/Lista)
- `/user` - Perfil de usuario y administración

Definidas en `src/app/app.routes.ts`

## Arquitectura Backend

Los servicios se ejecutan en paralelo (orquestados por `start-stack.ps1`):

| Servicio | Puerto | Función |
|----------|--------|---------|
| **api-gateway** | 3000 | Punto de entrada; enruta requests a microservicios; gestiona JWT |
| **user-service** | 3001 | CRUD usuarios; autenticación; permisos |
| **group-service** | 3003 | CRUD grupos y membresía |
| **ticket-service** | 3002 | CRUD tickets; historial; comentarios |

Cada servicio usa PostgreSQL con la misma base de datos (orquestación de esquemas).

## Variables de Entorno (.env)

Copiadas desde `.env.example`. Variables principales:

```
# API Gateway
PORT=3000
JWT_SECRET=<cambiar-en-producción>
RATE_LIMIT_MAX=100

# Servicios
USER_SERVICE_URL=http://localhost:3001
GROUP_SERVICE_URL=http://localhost:3003
TICKET_SERVICE_URL=http://localhost:3002

# Base de datos
DATABASE_URL=postgresql://user:pass@host:5432/bd
DATABASE_SSL=false  # true para Supabase
```

## Componentes Clave

### Autenticación

- Login + registro con validaciones (email, teléfono, contraseña robusta, mayoría de edad)
- JWT tokens almacenados en cookies y localStorage
- Bloqueo automático de cuentas inactivas
- Guards de ruta (`auth.guard.ts`, `permission.guard.ts`)

### Dashboard

- Resumen por estado (`Pendiente`, `En progreso`, `Bloqueado`, `Hecho`)
- Tarjetas de grupo con conteo de tickets
- Acceso directo a grupos y creación de tickets

### Gestión de Grupos

- Vistas Kanban (drag & drop) y Lista
- Filtros rápidos (`Mis tickets`, `Sin asignar`, `Prioridad alta`)
- Historial de cambios y comentarios
- Gestión de miembros (add/remove por email)
- CRUD de grupos

### Tickets

Campos: título, descripción, estado, prioridad (7 niveles), asignado, fechas límite  
Permisos granulares: `ticket:add`, `ticket:view`, `ticket:edit`, `ticket:edit:status`, `ticket:edit:*`, `ticket:delete`

### Perfil y Administración de Usuarios

- Edición de datos personales
- Vista de tickets asignados
- Panel admin con CRUD usuarios, activación/desactivación
- Gestión de permisos por usuario/grupo
- Usuario superAdmin preconfigurado

## Permisos Soportados

**Tickets:** add, view, edit (completo, status, comment, priority, deadline, assign), delete  
**Grupos:** view, add, edit, remove, add:members, remove:members  
**Usuarios:** add, view:all, edit, remove, edit:permissions, deactivate, activate

## Scripts

```bash
npm start         # Servidor Angular dev
npm run build     # Build producción
npm test          # Tests unitarios
npm run lint      # ESLint
.\start-stack.ps1 # Orquestar todo (frontend + 4 servicios backend)
```

## Estructura

```
src/app/
  pages/
    landing/          # Página de bienvenida
    login/            # Autenticación
    register/         # Registro
    dashboard/        # Panel principal
    group/            # Gestión de grupos y tickets
    user/             # Perfil y admin
backend/
  api-gateway/        # Fastify router (puerto 3000)
  user-service/       # NestJS (puerto 3001)
  group-service/      # NestJS (puerto 3003)
  ticket-service/     # Node.js (puerto 3002)
```