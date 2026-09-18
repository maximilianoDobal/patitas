# Clínica Veterinaria Patitas

MVP de gestión de turnos, clientes, mascotas e historias clínicas (Next.js App Router, JavaScript, **PostgreSQL obligatorio**).

## Requisitos

- Node.js 20+
- npm
- PostgreSQL local (psql en PATH o `PG_BIN`)

## Configuración local

1. Copiá `.env.example` a `.env.local` y completá:

   - `DATABASE_URL` — conexión a la base `patitas` (obligatoria para arrancar la app).
   - `AUTH_SECRET` — recomendado en producción.
   - `APP_BASE_URL` — URL pública para links de activación portal (default `http://localhost:3000`).
   - `EMAILJS_*` — activación portal (ver `.env.example`).

2. Creá y sembrá la base (drop/create + schema + fixtures):

   ```bash
   # PowerShell: definí la contraseña del usuario postgres
   $env:PGPASSWORD = "tu_password"
   npm run db:setup
   ```

   Tras **cambios breaking** en `sql/schema.sql`, volvé a ejecutar `npm run db:setup` (no hay migraciones incrementales en este MVP).

3. Instalá dependencias y levantá el servidor:

   ```bash
   npm install
   npm run dev
   ```

Abrí [http://localhost:3000](http://localhost:3000) (redirige a login).

### Usuarios demo (seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Recepcionista (PAT-CENTRO) | recepcion@patitas.local | recep123 |
| Recepcionista (PAT-NORTE) | recepcion.norte@patitas.local | recep123 |
| Veterinario (PAT-CENTRO) | garcia@patitas.local | vet123 |
| Veterinario (PAT-NORTE) | perez.norte@patitas.local | vet123 |
| Administrador | admin@patitas.local | admin123 |

Otros veterinarios del seed en **PAT-CENTRO** usan la misma contraseña `vet123`.

Recepción y administración pueden cambiar la **sucursal activa** en el menú lateral (reemite la sesión JWT). **Clientes** y **Mascotas** son globales a la marca; **Turnos** y catálogo operativo siguen la sucursal activa.

| Cliente demo | carlos.rodriguez@email.com / ana.perez@email.com | Activar portal (EmailJS o link en consola dev) → elegir contraseña |

**Portales:** `/portal/ingreso` (clientes), `/admin/ingreso` (administrador), `/login` (recepción/veterinario).

Flujo demo solicitud: cliente activado → solicitud en **PAT-NORTE** → recepción **Solicitudes** → confirmar (vet automático) → turno en agenda.

Los **Clientes** del seed tienen hash no usable hasta activación one-shot por email.

Para regenerar hashes bcrypt en `data/fixtures/usuarios.json` (solo si agregás `plainPassword` temporal):

```bash
node scripts/write-fixture-hashes.mjs
```

## Alcance MVP

- RF1, RF3, RF7, RF2 básico, login recepcionista/veterinario, persistencia PostgreSQL.
- Fixtures JSON en `data/fixtures/` alimentan **solo** el script `db:setup`, no el runtime.

Fuera del MVP: RF4 notificaciones masivas, facturación UI (tabla `comprobantes` preparada en SQL).
