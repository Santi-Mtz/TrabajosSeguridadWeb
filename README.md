# Practica_2

Aplicación Angular + PrimeNG para gestión de tickets por grupos con navegación responsive, tablero Kanban, lista, perfil de usuario y administración de permisos.

## Estado actual

- Versión visible: **1.6** (`src/app/app.ts`).
- Flujo principal: `Landing -> Login -> Dashboard -> Grupo`.
- Vistas implementadas: Login, Dashboard, Grupo (Kanban/Lista), Perfil de usuario, Gestión de grupo, Gestión de usuarios.
- Persistencia local completa con `localStorage`.

## Stack

- Angular 20 (`@angular/*` 20.3.x)
- PrimeNG 20.4.0
- PrimeIcons 7.0.0
- TypeScript ~5.9.2

Referencia: `package.json`

## Rutas

- `/landing`
- `/login`
- `/register`
- `/dashboard`
- `/group`
- `/user`

Rutas en `src/app/app.routes.ts`.

## Layout y navegación

- Sidebar desktop colapsable + drawer móvil (`src/app/app.html`, `src/app/app.css`).
- Navegación activa entre `Dashboard`, `Group` y `User`.
- En `/landing`, `/login`, `/register` se usa layout sin sidebar.

## Funcionalidades

### 1) Auth (frontend)

- Login con credenciales demo y persistencia de usuario actual en `auth.currentUser`.
- Registro con validaciones de email, teléfono, contraseña robusta y mayoría de edad.

### 2) Dashboard

Ubicación: `src/app/pages/dashboard/`

- Resumen global por estado.
- Estados oficiales: `Pendiente`, `En progreso`, `Bloqueado`, `Hecho`.
- Tarjetas por grupo con conteo por estado.
- Acciones por grupo:
	- Entrar al grupo
	- Crear ticket (abre modal de creación en vista de grupo)

### 3) Vista de Grupo

Ubicación: `src/app/pages/group/`

- Selector de grupo activo.
- Vistas: `Kanban` y `Lista`.
- Kanban con drag & drop entre columnas para cambio de estado.
- Detalle de ticket editable con reglas de permisos.
- Historial de cambios y comentarios con autor/fecha.
- Gestión de miembros del grupo (agregar por email / eliminar).
- Gestión básica de espacio:
	- Crear grupo
	- Editar nombre de grupo
	- Eliminar grupo
- Accesos rápidos desde el contexto del grupo:
	- Perfil de usuario
	- Gestión de usuarios

### 4) Crear Ticket (mínimo)

- Campos:
	- Título (obligatorio)
	- Descripción
	- Estado inicial (default: `Pendiente`)
	- Asignado a (opcional)
	- Prioridad (7 niveles en chino)
	- Fechas de creación y límite
- Se abre desde Dashboard o Grupo.
- Al crear:
	- persiste en `board.tickets`
	- aparece en Kanban/Lista
	- abre automáticamente detalle del ticket creado

### 5) Filtros rápidos

Componente común en Grupo (afecta Kanban y Lista):

- `Mis tickets`
- `Sin asignar`
- `Prioridad alta`
- `Todos` + botón `Limpiar rápidos`

Además de filtros detallados:

- Estado
- Prioridad
- Asignado
- FC/FL (desde/hasta)
- Orden por fechas/prioridad

### 6) Perfil de Usuario

Ubicación: `src/app/pages/user/`

- Muestra y edita datos del usuario actual:
	- `username`, `fullName`, `address`, `phone`, `birthDate`, `email`, `role`, `team`
- Muestra tickets asignados al usuario actual.
- Muestra resumen de carga:
	- Abiertos
	- En progreso
	- Bloqueados
	- Hechos

### 7) Gestión de Usuarios

Ubicación: `src/app/pages/user/`

- Usuario `superAdmin` preconfigurado con todos los permisos.
- CRUD de usuarios.
- Gestión de permisos por usuario:
	- agregar/quitar permisos individuales
	- agregar todos / quitar todos

Permisos soportados:

- `group:add`, `group:edit`, `group:delete`
- `ticket:create`, `ticket:edit`, `ticket:delete`
- `user:create`, `user:edit`, `user:delete`, `user:permissions`

Acceso a secciones admin de usuarios:

- Controlado por permisos CRUD de usuario (`user:create`, `user:edit`, `user:delete`)
- Gestión de permisos controlada por `user:permissions`

## Reglas de permisos actuales

### Tickets

- Creador/Admin: puede editar campos y reasignar.
- Asignado: puede cambiar estado y comentar.
- Cambios se registran en historial.

### Grupo

- `group:add`: crear grupo y agregar miembros.
- `group:edit`: editar nombre del grupo.
- `group:delete`: eliminar miembros y eliminar grupo.

### Usuarios

- `user:create`: crear usuarios.
- `user:edit`: editar usuarios.
- `user:delete`: eliminar usuarios (excepto superAdmin y usuario activo).
- `user:permissions`: administrar permisos por usuario.

## LocalStorage

- `auth.currentUser`: usuario autenticado actual.
- `crud.users`: catálogo de usuarios.
- `crud.user.permissions`: permisos por usuario.
- `crud.groups`: grupos.
- `board.group.permissions`: permisos por grupo.
- `board.group.members`: miembros por grupo.
- `board.tickets`: tickets.

## Estructura relevante

```text
src/
	app/
		app.config.ts
		app.routes.ts
		app.ts / app.html / app.css
		pages/
			landing/
			login/
			register/
			dashboard/
			group/
			user/
```

## Scripts

- `npm start` → servidor de desarrollo
- `npm run build` → build de producción
- `npm test` → pruebas unitarias

## Dependencias notables

| Paquete | Versión | Nota |
|---|---|---|
| `@angular/core` | ~20.3.x | Framework principal |
| `primeng` | ^20.4.0 | Librería de UI |
| `zone.js` | ^0.15.1 | Requerido por PrimeNG 20 para detección de cambios |

## Limitaciones actuales

- No hay backend real ni base de datos remota.
- Autenticación/roles persisten en localStorage (entorno demo).
- No hay route guards formales por permiso (las validaciones son por vista/acción).

## Historial de cambios

### v1.7 — Julio 2025

#### Correcciones de compatibilidad PrimeNG 20
- `<p-inputtext [(ngModel)]>` → `<input pInputText [(ngModel)]>` en login, register, group, user.
  - En PrimeNG 20 `p-inputtext` y `p-textarea` son *componentes de presentación*, **no** implementan `ControlValueAccessor`; el binding `[(ngModel)]` debe hacerse sobre el elemento nativo con la directiva.
- `<p-textarea [(ngModel)]>` → `<textarea pTextarea [(ngModel)]>` en group.
- Todos los `[(ngModel)]` sin `FormGroup`/`name` llevan ahora `[ngModelOptions]="{standalone: true}"` (login, register, group, user, dashboard).

#### Integración de zone.js
- `zone.js ^0.15.1` añadido como dependencia directa (`npm install zone.js --save`).
- `import 'zone.js'` agregado como primera línea de `src/main.ts`.
- `provideZonelessChangeDetection()` reemplazado por `provideZoneChangeDetection({ eventCoalescing: true })` en `app.config.ts`.
  - PrimeNG 20 requiere zone.js activo para gestionar el ciclo de vida de sus componentes internos.

#### Carga bajo demanda (Lazy Loading)
- Todos los componentes de ruta migrados a `loadComponent` con imports dinámicos en `app.routes.ts`.
- Los chunks solo se descargan al navegar por primera vez a la ruta.
- `withPreloading(PreloadAllModules)` añadido al router: tras la carga inicial, Angular descarga el resto de chunks en segundo plano para que las navegaciones siguientes sean instantáneas.

#### Optimización de Change Detection
- `ChangeDetectionStrategy.OnPush` aplicado a `GroupComponent`, `UserComponent` y `DashboardComponent`.
- `ChangeDetectorRef.markForCheck()` llamado dentro de los callbacks `subscribe()` de `queryParamMap` (group y user) para que la vista se actualice al cambiar parámetros de ruta.
- Template de kanban: variable `@let statusTickets = ticketsByStatus(status)` por columna, reduciendo las llamadas al método de 15 a 5 por ciclo de detección de cambios.

---

### v1.6 — Marzo 2026

#### Nuevas funcionalidades
- Estado **Revisión** añadido a todos los componentes (`group`, `dashboard`, `user`).
- Mini-listas en Dashboard: *Tickets recientes* y *Mis tickets* por grupo seleccionado.
- Flujo toggle para crear grupo (botón **Nuevo grupo / Cancelar**) sin salir de la vista.
- Botón **Limpiar todo** que resetea los 8 filtros simultáneamente.
- Kanban con 5 columnas y scroll horizontal (`grid-auto-flow: column; overflow-x: auto`).

#### Autorización
- Eliminada la dependencia del campo `role` en todos los componentes.
- Acceso 100% basado en permisos (`group:add/edit/delete`, `ticket:*`, `user:*`).

#### UI — Migración completa a PrimeNG
- `<input type="date">` en registro → `p-datepicker`.
- `<input pInputText>` → `<p-inputtext>` en login, register, group, user.
- `<textarea pTextarea>` → `<p-textarea>` en group.
- `<small>` con validaciones → `<p-message>` con severidad correcta en login y register.
- Textos de prioridades en chino → español: `Muy baja`, `Baja`, `Media-baja`, `Media`, `Media-alta`, `Alta`, `Urgente`.

#### Refactorización y optimización de código
- `group.component.ts`: 1350 → 1255 líneas (**−95**).
- `user.component.ts`: 864 → 829 líneas (**−35**).
- **Switch statements** de severidad y peso de prioridad reemplazados por lookup maps (`STATUS_SEV`, `PRIORITY_SEV`, `PRIORITY_W`).
- `normalizeStatus` / `normalizePriority` simplificados con `Array.includes()`.
- Métodos `persist*` unificados en un helper `persist(key, value)` de 2 líneas.
- `isTicketCreator` / `isTicketAssignee` fusionados en `matchesCurrentUser(ticket, field)`.
- `startOfDay` / `endOfDay` / `toDate` / `normalizeBirthDate` reducidos a one-liners.
