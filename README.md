# Clínica Veterinaria Patitas

MVP de gestión de turnos, clientes, mascotas e historias clínicas (Next.js App Router, JavaScript, datos mock).

## Requisitos

- Node.js 20+
- npm

## Desarrollo

```bash
npm install
npm run dev
npm test
```

Abrí [http://localhost:3000](http://localhost:3000) (redirige a login).

### Usuarios demo (fixtures)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Recepcionista | recepcion@patitas.local | recep123 |
| Veterinario | garcia@patitas.local | vet123 |

Otros veterinarios en fixtures usan la misma contraseña `vet123`.

Para regenerar hashes bcrypt en `data/fixtures/usuarios.json` (solo si agregás `plainPassword` temporal):

```bash
node scripts/write-fixture-hashes.mjs
```

## Documentación de dominio

- `CONTEXT.md` — glosario
- `docs/adr/` — decisiones de arquitectura
- `sql/schema.sql` — esquema PostgreSQL orientativo

## Alcance MVP

- RF1, RF3, RF7, RF2 básico, login recepcionista/veterinario, repositorio mock + JSON.

Fuera del MVP: portal cliente, notificaciones, facturación UI (tabla `comprobantes` preparada en SQL).

Los cambios en runtime se guardan **en memoria** (se reinician al recargar el servidor). Los JSON en `data/fixtures/` son la semilla inicial.
