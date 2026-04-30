# parqueRM Backend

NestJS REST API backend for the parqueRM national park management system. Handles authentication, RBAC, visitor registration, vehicle control, lodging, cash management, receipts, and reporting.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS (TypeScript) |
| Database | SQL Server (via TypeORM) |
| Auth | JWT (access + refresh tokens) |
| Password hashing | bcrypt |
| API docs | Swagger / OpenAPI |
| Security | Helmet, @nestjs/throttler |
| Containerization | Docker (multi-stage build) |
| ORM | TypeORM (`synchronize: false`) |

---

## Prerequisites

- Node.js 22+
- npm 10+
- SQL Server 2019+ (or Docker)
- Docker + Docker Compose (for full-stack local deployment)

---

## Environment Setup

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `DB_HOST` | SQL Server host (`sqlserver` in Docker, `localhost` locally) | — |
| `DB_PORT` | SQL Server port | `1433` |
| `DB_USER` | SQL Server user | — |
| `DB_PASSWORD` | SQL Server password | — |
| `DB_NAME` | Database name | `ParqueRM` |
| `DB_ENCRYPT` | Enable TLS encryption | `false` |
| `DB_TRUST_SERVER_CERT` | Trust self-signed cert | `true` |
| `JWT_SECRET` | Access token signing secret (min 16 chars) | — |
| `JWT_EXPIRES_IN` | Access token TTL | `1h` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (min 16 chars) | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `ADMIN_BOOTSTRAP` | Seed initial admin user on startup | `false` |
| `ADMIN_USERNAME` | Bootstrap admin username | — |
| `ADMIN_PASSWORD` | Bootstrap admin password | — |
| `ADMIN_FULL_NAME` | Bootstrap admin full name | `Administrador` |
| `ADMIN_EMAIL` | Bootstrap admin email | — |
| `CORS_ORIGIN` | Allowed CORS origin | `true` (all) |
| `THROTTLE_TTL` | Global rate limit window (seconds) | `60` |
| `THROTTLE_LIMIT` | Global rate limit max requests | `100` |
| `AUTH_THROTTLE_TTL` | Auth endpoint rate limit window | `60` |
| `AUTH_THROTTLE_LIMIT` | Auth endpoint rate limit max requests | `5` |
| `DEFAULT_PAGE_SIZE` | Default items per page | `20` |
| `MAX_PAGE_SIZE` | Maximum items per page | `100` |

---

## Running Locally

```bash
# Install dependencies
npm install

# Start in watch mode (recommended for development)
npm run start:dev

# Start in debug + watch mode
npm run start:debug

# Build for production
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000/api`.
Swagger docs at `http://localhost:3000/api/docs`.

---

## Docker Deployment

Docker Compose is managed from the root project:

```bash
cd ../parqueRM-root

# Start all services
docker compose up -d --build

# Stop
docker compose down

# Stop and wipe DB volume
docker compose down -v

# View backend logs
docker compose logs -f backend
```

Services started:
- `sqlserver` — SQL Server 2019 (port 1433)
- `db-init` — One-shot container that runs init SQL scripts then exits
- `backend` — This NestJS API (port 3000)
- `frontend` — React + Nginx (port 80)

Inside Docker the backend connects to SQL Server using the service name `sqlserver` (not `localhost`).

---

## API Documentation

Swagger UI is available at:

```
http://localhost:3000/api/docs
```

All endpoints are documented with request/response schemas, authentication requirements, and permission codes.

---

## Architecture Overview

```
src/
  app.module.ts          -- Root module
  main.ts                -- Bootstrap (global prefix /api, CORS, Swagger, guards)

  config/                -- ConfigModule + env validation
  database/              -- TypeORM setup + all 27 entities

  common/
    decorators/          -- @CurrentUser(), @RequirePermissions(), @Public()
    dto/                 -- PaginationDto
    filters/             -- AllExceptionsFilter (standard error shape)
    guards/              -- JwtAuthGuard, PermissionsGuard
    interfaces/          -- ApiResponse<T>, AuthenticatedUser
    services/            -- ResponseService (global)
    constants/           -- ResponseCodes

  audit/                 -- AuditLog entity + AuditService + controller
  auth/                  -- Login, signup, refresh, /me, change-password
  users/                 -- User management
  roles/                 -- Role management + permission assignment
  permissions/           -- Permission read endpoints
  health/                -- Health check

  park-config/           -- Park configuration (name, logo, capacity, services)
  catalogs/              -- All catalog types (countries, departments, etc.)
  tariffs/               -- Tariff management + tariff resolution

  visitors/              -- Visitor record CRUD + check-out + summaries
  vehicles/              -- Vehicle record CRUD + check-out + exit control
  lodging/               -- Lodging record CRUD + summaries
  dashboard/             -- Dashboard statistics

  receipts/              -- Receipt creation, cancellation, printing
  cash/                  -- Financial movements + cash closures
  reports/               -- Read-only reporting + export endpoints
  prints/                -- Print data endpoints (ticket, receipt, closure)
```

---

## Standard Response Format

Every endpoint returns the same envelope:

```json
{
  "success": true,
  "code": "OK",
  "message": "Description",
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 },
  "errors": null
}
```

---

## Authentication Flow

1. `POST /api/auth/signup` — Register a new account. Returns tokens + user.
2. `POST /api/auth/login` — Login with `{ username, password }`. Returns `accessToken` + `refreshToken`.
3. Include `Authorization: Bearer <accessToken>` in all protected requests.
4. When the access token expires, call `POST /api/auth/refresh` with `{ refreshToken }`.
5. `GET /api/auth/me` — Returns the current authenticated user profile with permissions.
6. `POST /api/auth/logout` — Stateless logout (invalidate token client-side).
7. `PATCH /api/auth/change-password` — Change own password (requires current password).

The access token payload: `{ sub, username, roleId, roleName, permissions[] }`.

---

## RBAC Overview

```
User → Role → Permissions[]
```

- Each **User** has one **Role**.
- Each **Role** has many **Permissions**.
- Permissions are loaded from the database at login and embedded in the JWT.
- Every protected endpoint uses `@RequirePermissions('CODE')`.
- The global `PermissionsGuard` checks the claim on every request.

### Permission Codes

| Code | Description |
|---|---|
| `VISITANTES_CREATE` | Register visitors |
| `VISITANTES_READ` | View visitor records |
| `VISITANTES_UPDATE` | Edit visitor records |
| `VISITANTES_CHECKOUT` | Check out visitors |
| `VEHICULOS_CREATE` | Register vehicles |
| `VEHICULOS_READ` | View vehicle records |
| `VEHICULOS_UPDATE` | Edit vehicle records |
| `VEHICULOS_ENABLE_EXIT` | Enable/disable vehicle exit |
| `HOSPEDAJE_CREATE` | Register lodging |
| `HOSPEDAJE_READ` | View lodging records |
| `RECEIPTS_CREATE` | Create/update receipts |
| `RECEIPTS_READ` | View receipts |
| `RECEIPTS_CANCEL` | Cancel receipts |
| `RECEIPTS_PRINT` | Print receipts |
| `CAJA_CREATE_MOVEMENT` | Create cash movements |
| `CAJA_READ` | View cash movements and closures |
| `CAJA_CLOSE` | Create cash closures |
| `CAJA_CANCEL_MOVEMENT` | Cancel cash movements |
| `REPORTES_READ` | View reports and dashboard |
| `REPORTES_EXPORT` | Export reports |
| `CONFIG_READ` | View park configuration |
| `CONFIG_UPDATE` | Edit park configuration |
| `CATALOGS_READ` | View catalogs |
| `CATALOGS_MANAGE` | Create/edit/delete catalog items |
| `USERS_READ` | View users |
| `USERS_MANAGE` | Create/edit/deactivate users |
| `ROLES_READ` | View roles and permissions |
| `ROLES_MANAGE` | Manage roles and permissions |
| `AUDIT_READ` | View audit logs |

### Default Roles

| Role | Permissions |
|---|---|
| **Administrador** | All permissions |
| **Operador de caja** | VISITANTES_CREATE/READ/CHECKOUT, VEHICULOS_CREATE/READ/ENABLE_EXIT, HOSPEDAJE_CREATE/READ, RECEIPTS_CREATE/READ/PRINT, CAJA_CREATE_MOVEMENT/READ, REPORTES_READ, CONFIG_READ, CATALOGS_READ |
| **Consulta** | VISITANTES_READ, VEHICULOS_READ, HOSPEDAJE_READ, RECEIPTS_READ, CAJA_READ, REPORTES_READ, CONFIG_READ, CATALOGS_READ |

---

## All Available Endpoints

### Auth — `/api/auth`

| Method | Path | Auth | Permission | Description |
|---|---|---|---|---|
| POST | `/api/auth/signup` | Public | — | Register new account (auto-login) |
| POST | `/api/auth/login` | Public | — | Login, returns access + refresh token |
| POST | `/api/auth/logout` | Bearer | — | Logout (stateless) |
| GET | `/api/auth/me` | Bearer | — | Current user profile + permissions |
| POST | `/api/auth/refresh` | Public | — | Refresh access token |
| PATCH | `/api/auth/change-password` | Bearer | — | Change own password |

---

### Users — `/api/users`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/users` | USERS_READ | List users (paginated, filter by role/status) |
| GET | `/api/users/:id` | USERS_READ | Get user by ID |
| POST | `/api/users` | USERS_MANAGE | Create user |
| PATCH | `/api/users/:id` | USERS_MANAGE | Update user |
| PATCH | `/api/users/:id/status` | USERS_MANAGE | Toggle user active/inactive |
| PATCH | `/api/users/:id/password` | USERS_MANAGE | Reset user password |
| DELETE | `/api/users/:id` | USERS_MANAGE | Soft-delete user (sets is_active=false) |

---

### Roles — `/api/roles`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/roles` | ROLES_READ | List all roles with permissions |
| GET | `/api/roles/:id` | ROLES_READ | Get role by ID |
| POST | `/api/roles` | ROLES_MANAGE | Create role |
| PATCH | `/api/roles/:id` | ROLES_MANAGE | Update role |
| DELETE | `/api/roles/:id` | ROLES_MANAGE | Soft-delete role (sets is_active=false) |
| GET | `/api/roles/:id/permissions` | ROLES_READ | Get permissions assigned to role |
| PATCH | `/api/roles/:id/permissions` | ROLES_MANAGE | Replace role's permission set |

---

### Permissions — `/api/permissions`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/permissions` | ROLES_READ | List all permissions |
| GET | `/api/permissions/grouped-by-module` | ROLES_READ | Permissions grouped by module |
| GET | `/api/permissions/:id` | ROLES_READ | Get permission by ID |

---

### Health — `/api/health`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | API status check |
| GET | `/api/health/database` | Public | Database connectivity check |

---

### Park Config — `/api/park-config`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/park-config` | CONFIG_READ | Get park configuration |
| PATCH | `/api/park-config` | CONFIG_UPDATE | Update park configuration |
| GET | `/api/park-config/services` | CONFIG_READ | List services |
| PATCH | `/api/park-config/services/:id/toggle` | CONFIG_UPDATE | Enable/disable a service |

---

### Catalogs — `/api/catalogs`

All catalog types follow the same pattern. Deletes are soft (sets `is_active = false`).

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/catalogs/countries` | CATALOGS_READ | List countries |
| GET | `/api/catalogs/countries/:id` | CATALOGS_READ | Get country |
| POST | `/api/catalogs/countries` | CATALOGS_MANAGE | Create country |
| PATCH | `/api/catalogs/countries/:id` | CATALOGS_MANAGE | Update country |
| PATCH | `/api/catalogs/countries/:id/status` | CATALOGS_MANAGE | Toggle active |
| DELETE | `/api/catalogs/countries/:id` | CATALOGS_MANAGE | Soft-delete |
| GET | `/api/catalogs/departments` | CATALOGS_READ | List departments |
| GET | `/api/catalogs/departments/:id` | CATALOGS_READ | Get department |
| POST | `/api/catalogs/departments` | CATALOGS_MANAGE | Create |
| PATCH | `/api/catalogs/departments/:id` | CATALOGS_MANAGE | Update |
| PATCH | `/api/catalogs/departments/:id/status` | CATALOGS_MANAGE | Toggle active |
| DELETE | `/api/catalogs/departments/:id` | CATALOGS_MANAGE | Soft-delete |
| GET | `/api/catalogs/municipalities` | CATALOGS_READ | List municipalities |
| GET | `/api/catalogs/municipalities/:id` | CATALOGS_READ | Get municipality |
| GET | `/api/catalogs/departments/:departmentId/municipalities` | CATALOGS_READ | Municipalities by department |
| POST | `/api/catalogs/municipalities` | CATALOGS_MANAGE | Create |
| PATCH | `/api/catalogs/municipalities/:id` | CATALOGS_MANAGE | Update |
| PATCH | `/api/catalogs/municipalities/:id/status` | CATALOGS_MANAGE | Toggle active |
| DELETE | `/api/catalogs/municipalities/:id` | CATALOGS_MANAGE | Soft-delete |
| GET/POST/PATCH/DELETE | `/api/catalogs/visitor-categories` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/vehicle-types` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/lodging-types` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/payment-methods` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/financial-concepts` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/visit-reasons` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/visit-activities` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/info-sources` | CATALOGS_READ/MANAGE | Same CRUD pattern |
| GET/POST/PATCH/DELETE | `/api/catalogs/travel-types` | CATALOGS_READ/MANAGE | Same CRUD pattern |

---

### Tariffs — `/api/tariffs`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/tariffs` | CATALOGS_READ | List tariffs (filter by appliesTo, serviceId, isActive) |
| GET | `/api/tariffs/visitors` | CATALOGS_READ | Active visitor tariffs |
| GET | `/api/tariffs/vehicles` | CATALOGS_READ | Active vehicle tariffs |
| GET | `/api/tariffs/lodging` | CATALOGS_READ | Active lodging tariffs |
| GET | `/api/tariffs/resolve` | CATALOGS_READ | Resolve best matching tariff (query params) |
| GET | `/api/tariffs/:id` | CATALOGS_READ | Get tariff by ID |
| POST | `/api/tariffs` | CATALOGS_MANAGE | Create tariff |
| PATCH | `/api/tariffs/:id` | CATALOGS_MANAGE | Update tariff |
| PATCH | `/api/tariffs/:id/status` | CATALOGS_MANAGE | Toggle active (soft-delete) |
| DELETE | `/api/tariffs/:id` | CATALOGS_MANAGE | Soft-delete tariff |

---

### Visitors — `/api/visitors`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/visitors/currently-inside` | VISITANTES_READ | Visitors with no check-out |
| GET | `/api/visitors/today` | VISITANTES_READ | Today's records |
| GET | `/api/visitors/today-summary` | VISITANTES_READ | Today's count + amounts by category |
| GET | `/api/visitors/occupancy` | VISITANTES_READ | Current inside vs max capacity |
| GET | `/api/visitors/search?q=` | VISITANTES_READ | Search by name or ID number |
| GET | `/api/visitors` | VISITANTES_READ | List (paginated, filters: from/to/category/country/source/inside) |
| GET | `/api/visitors/:id` | VISITANTES_READ | Get visitor record |
| POST | `/api/visitors` | VISITANTES_CREATE | Register visitor |
| PATCH | `/api/visitors/:id` | VISITANTES_UPDATE | Update visitor record |
| DELETE | `/api/visitors/:id` | VISITANTES_UPDATE | Hard delete with audit |
| POST | `/api/visitors/bulk-check-out` | VISITANTES_CHECKOUT | Bulk check-out `{ ids: number[] }` |
| POST | `/api/visitors/:id/check-out` | VISITANTES_CHECKOUT | Check out single visitor |
| GET | `/api/visitors/:id/ticket` | VISITANTES_READ | Visitor ticket data |

---

### Vehicles — `/api/vehicles`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/vehicles/currently-parked` | VEHICULOS_READ | Vehicles with no check-out |
| GET | `/api/vehicles/today` | VEHICULOS_READ | Today's vehicle records |
| GET | `/api/vehicles/today-summary` | VEHICULOS_READ | Today's count + amounts by type |
| GET | `/api/vehicles/search?q=` | VEHICULOS_READ | Search by plate number |
| GET | `/api/vehicles` | VEHICULOS_READ | List (paginated, filters: from/to/type/parked/exitEnabled) |
| GET | `/api/vehicles/:id` | VEHICULOS_READ | Get vehicle record |
| POST | `/api/vehicles` | VEHICULOS_CREATE | Register vehicle |
| PATCH | `/api/vehicles/:id` | VEHICULOS_UPDATE | Update vehicle record |
| DELETE | `/api/vehicles/:id` | VEHICULOS_UPDATE | Hard delete with audit |
| POST | `/api/vehicles/:id/check-out` | VEHICULOS_UPDATE | Check out vehicle |
| PATCH | `/api/vehicles/:id/enable-exit` | VEHICULOS_ENABLE_EXIT | Enable vehicle exit |
| PATCH | `/api/vehicles/:id/disable-exit` | VEHICULOS_ENABLE_EXIT | Disable vehicle exit |

---

### Lodging — `/api/lodging`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/lodging/today` | HOSPEDAJE_READ | Today's lodging records |
| GET | `/api/lodging/today-summary` | HOSPEDAJE_READ | Today's guests/nights/amounts |
| GET | `/api/lodging/month-summary?year=&month=` | HOSPEDAJE_READ | Monthly summary |
| GET | `/api/lodging` | HOSPEDAJE_READ | List (paginated, filters: from/to/lodgingTypeId) |
| GET | `/api/lodging/:id` | HOSPEDAJE_READ | Get lodging record |
| POST | `/api/lodging` | HOSPEDAJE_CREATE | Register lodging |
| PATCH | `/api/lodging/:id` | HOSPEDAJE_CREATE | Update lodging record |
| DELETE | `/api/lodging/:id` | HOSPEDAJE_CREATE | Hard delete with audit |

---

### Dashboard — `/api/dashboard`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | REPORTES_READ | Today + last 7 days overview |
| GET | `/api/dashboard/today` | REPORTES_READ | Today's totals (visitors/vehicles/lodging/income) |
| GET | `/api/dashboard/visitors-summary?from=&to=` | REPORTES_READ | Visitor stats for date range |
| GET | `/api/dashboard/vehicles-summary?from=&to=` | REPORTES_READ | Vehicle stats for date range |
| GET | `/api/dashboard/income-summary?from=&to=` | REPORTES_READ | Income/expense by date range and method |
| GET | `/api/dashboard/latest-movements?limit=` | REPORTES_READ | Latest financial movements |
| GET | `/api/dashboard/occupancy` | REPORTES_READ | Current occupancy vs max capacity |

---

### Receipts — `/api/receipts`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/receipts/next-number` | RECEIPTS_READ | Next auto-generated receipt number |
| GET | `/api/receipts` | RECEIPTS_READ | List (paginated, filters: from/to/status/paymentMethod/originType) |
| GET | `/api/receipts/:id` | RECEIPTS_READ | Get receipt with lines |
| POST | `/api/receipts` | RECEIPTS_CREATE | Create receipt + lines |
| PATCH | `/api/receipts/:id` | RECEIPTS_CREATE | Update receipt (ACTIVO only) |
| PATCH | `/api/receipts/:id/cancel` | RECEIPTS_CANCEL | Cancel receipt (sets ANULADO) |
| DELETE | `/api/receipts/:id` | RECEIPTS_CANCEL | Hard delete (ANULADO receipts only) |
| GET | `/api/receipts/:id/print` | RECEIPTS_PRINT | Receipt data for printing |
| POST | `/api/receipts/:id/print` | RECEIPTS_PRINT | Trigger print |

---

### Cash Movements — `/api/cash/movements`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/cash/movements` | CAJA_READ | List movements (paginated, filters: from/to/type/concept/method/status) |
| GET | `/api/cash/movements/:id` | CAJA_READ | Get movement by ID |
| POST | `/api/cash/movements` | CAJA_CREATE_MOVEMENT | Create movement |
| PATCH | `/api/cash/movements/:id` | CAJA_CREATE_MOVEMENT | Update movement |
| PATCH | `/api/cash/movements/:id/cancel` | CAJA_CANCEL_MOVEMENT | Cancel movement (blocked if in a closure) |
| GET | `/api/cash/summary?from=&to=` | CAJA_READ | Income/expense totals by date range |
| GET | `/api/cash/today-summary` | CAJA_READ | Today's cash summary |
| GET | `/api/cash/income-summary?from=&to=` | CAJA_READ | Income movements only |
| GET | `/api/cash/expense-summary?from=&to=` | CAJA_READ | Expense movements only |
| GET | `/api/cash/by-payment-method?from=&to=` | CAJA_READ | Totals grouped by payment method |
| GET | `/api/cash/by-service?from=&to=` | CAJA_READ | Totals grouped by origin type |

---

### Cash Closures — `/api/cash/closures`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/cash/closures/preview` | CAJA_CLOSE | Preview unassigned movements before closing |
| GET | `/api/cash/closures` | CAJA_READ | List all closures (paginated) |
| POST | `/api/cash/closures` | CAJA_CLOSE | Create cash closure (assigns open movements) |
| GET | `/api/cash/closures/:id` | CAJA_READ | Get closure by ID |
| GET | `/api/cash/closures/:id/details` | CAJA_READ | Closure breakdown details |
| GET | `/api/cash/closures/:id/print` | CAJA_READ | Closure data for printing |

---

### Reports — `/api/reports`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/reports/general` | REPORTES_READ | Combined stats |
| GET | `/api/reports/visitors` | REPORTES_READ | Visitor records (paginated) |
| GET | `/api/reports/visitors/by-category` | REPORTES_READ | Visitors grouped by category |
| GET | `/api/reports/visitors/by-origin` | REPORTES_READ | Visitors grouped by country |
| GET | `/api/reports/visitors/by-nationality` | REPORTES_READ | Visitors grouped by nationality |
| GET | `/api/reports/vehicles` | REPORTES_READ | Vehicle records (paginated) |
| GET | `/api/reports/lodging` | REPORTES_READ | Lodging records (paginated) |
| GET | `/api/reports/income` | REPORTES_READ | Income movements (paginated) |
| GET | `/api/reports/expenses` | REPORTES_READ | Expense movements (paginated) |
| GET | `/api/reports/cash-closures` | REPORTES_READ | Cash closures (paginated) |
| GET | `/api/reports/receipts` | REPORTES_READ | Receipts (paginated) |
| GET | `/api/reports/export/excel` | REPORTES_EXPORT | General export (Excel format) |
| GET | `/api/reports/export/pdf` | REPORTES_EXPORT | General export (PDF format) |
| GET | `/api/reports/visitors/export/excel` | REPORTES_EXPORT | Visitor report export |
| GET | `/api/reports/visitors/export/pdf` | REPORTES_EXPORT | Visitor report export |
| GET | `/api/reports/income/export/excel` | REPORTES_EXPORT | Income report export |
| GET | `/api/reports/income/export/pdf` | REPORTES_EXPORT | Income report export |
| GET | `/api/reports/cash-closures/export/excel` | REPORTES_EXPORT | Cash closure export |
| GET | `/api/reports/cash-closures/export/pdf` | REPORTES_EXPORT | Cash closure export |

All report endpoints accept query params: `from`, `to`, `page`, `limit`, and type-specific filters.

---

### Prints — `/api/prints`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/prints/visitor-ticket/:id` | VISITANTES_READ | Visitor ticket data for print |
| GET | `/api/prints/receipt/:id` | RECEIPTS_PRINT | Receipt + lines data for print |
| GET | `/api/prints/cash-closure/:id` | CAJA_READ | Cash closure + details for print |

---

### Audit Logs — `/api/audit-logs`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/api/audit-logs` | AUDIT_READ | List audit logs (paginated) |
| GET | `/api/audit-logs/by-entity?entityName=&entityId=` | AUDIT_READ | Logs for a specific entity |
| GET | `/api/audit-logs/by-user/:userId` | AUDIT_READ | Logs for a specific user |
| GET | `/api/audit-logs/:id` | AUDIT_READ | Get single audit log |

---

## Security Features

- **Rate limiting** — Global throttler (100 req/60s). Auth endpoints have stricter limits (5 req/60s).
- **JWT guards** — `JwtAuthGuard` applied globally. Use `@Public()` to exempt endpoints.
- **Permissions guard** — `PermissionsGuard` applied globally. Validates permissions from JWT on every request.
- **CORS** — Configurable via `CORS_ORIGIN` env var with credentials support.
- **Helmet** — HTTP security headers applied globally.
- **Audit logs** — All mutations (create, update, cancel, delete, cash close, login, signup) are written to `audit_logs` with user ID, IP address, and old/new values.
- **Soft deletes** — Entities with `is_active` are deactivated rather than deleted. Hard deletes only where `is_active` does not exist.
- **Password hashing** — All passwords stored using bcrypt (12 rounds).
- **No raw errors** — All errors return the standard response envelope. Stack traces suppressed in production.
- **No secrets in code** — All sensitive values via environment variables.

---

## Database

- SQL Server 2019+
- TypeORM with `synchronize: false` — schema managed via init scripts
- Init scripts at `../parqueRM-root/db/init/`:
  - `01_create_database.sql` — Create database
  - `02_schema.sql` — All tables and indexes
  - `03_seed_security.sql` — Roles, permissions, role_permissions
  - `04_seed_catalogs.sql` — Catalog data
  - `05_seed_tariffs.sql` — Tariff data
  - `06_seed_park_config.sql` — Initial park configuration
- The backend does **not** auto-create or modify tables

---

## Testing

```bash
# Unit tests
npm test

# Single test file
npx jest src/app.controller.spec.ts

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

---

## Code Quality

```bash
# ESLint with auto-fix
npm run lint

# Prettier format
npm run format
```
