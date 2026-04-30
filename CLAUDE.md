# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**parqueRM-backend** — NestJS REST API backend for the parqueRM application (parking management system). Currently in early scaffold stage.

## Commands

```bash
# Development
npm run start:dev       # watch mode (recommended for development)
npm run start:debug     # debug + watch mode

# Build & Production
npm run build           # compile TypeScript to dist/
npm run start:prod      # run compiled output

# Testing
npm test                # unit tests (jest, rootDir: src, matches *.spec.ts)
npm run test:e2e        # e2e tests (config: test/jest-e2e.json)
npm run test:cov        # coverage report

# Code quality
npm run lint            # eslint with auto-fix
npm run format          # prettier format
```

To run a single test file:
```bash
npx jest src/app.controller.spec.ts
```

## Architecture

Standard NestJS module architecture. Entry point is `src/main.ts`, which bootstraps the app with:
- Global route prefix: `/api`
- CORS enabled (all origins, with credentials)
- Port from `PORT` env var, defaulting to `3000`, bound to `0.0.0.0`

New domain features follow the NestJS pattern: create a module (`*.module.ts`), controller (`*.controller.ts`), and service (`*.service.ts`) under `src/<feature>/`, then import the module into `AppModule`.

## Docker

Multi-stage build using `node:22-alpine`. Builder compiles TypeScript; runner installs only production deps and serves `dist/main.js` on port 3000.

## TypeScript config notes

- `noImplicitAny` is disabled — typed parameters are encouraged but not enforced by the compiler.
- Module system: `nodenext` / ESM-compatible via `esModuleInterop`.
- Decorators: `emitDecoratorMetadata` and `experimentalDecorators` are enabled (required by NestJS).

# ParqueRM Backend Instructions

This repository is the NestJS backend for ParqueRM.

## Project context

The full project is structured as sibling folders:

```txt
parqueRM/
  parqueRM-root/
  parqueRM-backend/
  parqueRM-frontend/
```

Claude is being run from:

```txt
parqueRM-backend/
```

but must read documentation from:

```txt
../parqueRM-root/
```

## Required reading before coding

Before making backend changes, read these files:

```txt
../parqueRM-root/README.md
../parqueRM-root/db/init/02_schema.sql
../parqueRM-root/db/init/03_seed_security.sql
../parqueRM-root/docs/permissions.md
../parqueRM-root/docs/docker.md
../parqueRM-root/docs/mermaid/database-er.md
```

Use these files as the source of truth.

## Editing rules

- Only edit files inside `parqueRM-backend/`.
- Do not edit `../parqueRM-root/` unless explicitly requested.
- Do not edit `../parqueRM-frontend/` unless explicitly requested.
- You may read sibling folders, but backend code changes must stay inside this repo.

## Backend stack

- NestJS
- SQL Server
- JWT authentication
- RBAC permissions
- Docker local deployment

## Database rules

- Use SQL Server.
- Use the schema from `../parqueRM-root/db/init/02_schema.sql`.
- Do not create tables that are not in the schema unless explicitly asked.
- Do not rename tables.
- Do not hardcode park data, tariffs, users, or URLs.
- Read configuration from environment variables.

## Security rules

- Security must be enforced in the backend.
- Frontend permissions are only for UI visibility.
- Use JWT.
- Use guards.
- Use a permissions decorator.
- Validate permissions per endpoint.

## Local deployment rules

- The backend must listen on `0.0.0.0`.
- The backend must expose API routes under `/api`.
- Docker Compose is managed from `../parqueRM-root/docker-compose.yml`.
- Inside Docker, the backend must connect to SQL Server using the service name `sqlserver`, not `localhost`.

## Environment variables

Use environment variables for all sensitive or environment-specific values.

Expected variables:

```env
PORT=3000
DB_HOST=sqlserver
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=<from docker compose env>
DB_NAME=ParqueRM
JWT_SECRET=<from docker compose env>
```

## Architecture rules

Use modular NestJS architecture.

Recommended initial modules:

```txt
src/
  app.module.ts
  main.ts

  config/
  database/

  auth/
  users/
  roles/
  permissions/

  common/
    decorators/
    guards/
    interfaces/
```

## First backend priority

Build the backend foundation in this order:

1. Config setup.
2. SQL Server database connection.
3. AuthModule.
4. UsersModule.
5. RolesModule.
6. PermissionsModule.
7. JwtAuthGuard.
8. PermissionsGuard.
9. `@RequirePermissions()` decorator.
10. `/auth/login`.
11. `/auth/me`.

Do not build all business modules until auth and RBAC are working.

## Important implementation notes

- Passwords must be hashed using `bcrypt`.
- Do not create the initial admin user in plain SQL.
- If an initial admin seed is needed, create it through backend code using a hashed password.
- Permissions should be loaded from the database.
- JWT may include user id, username, role, and permissions.
- Backend endpoints must validate permissions even if the frontend hides UI elements.

## Do not do

- Do not use PostgreSQL.
- Do not use external cloud services.
- Do not depend on internet APIs.
- Do not hardcode the park name inside backend logic.
- Do not hardcode local IPs inside backend code.
- Do not trust frontend permissions as security.
- Do not modify closed cash movements without audit logic.

## First action when starting a new task

Before writing code, inspect:

```txt
../parqueRM-root/db/init/02_schema.sql
../parqueRM-root/docs/permissions.md
src/
package.json
```

Then explain the plan before editing files.
