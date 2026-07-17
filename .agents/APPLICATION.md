# Referencia rápida: Huca Comités

## Finalidad

Aplicación web para gestionar grupos de usuarios, sus altas y bajas, reuniones y asistencia. Los usuarios normales son personas que se pueden asignar a grupos; únicamente los administradores pueden iniciar sesión y operar la plataforma.

## Arquitectura

- Backend: Node.js + Express, punto de entrada `app.js`.
- Base de datos: SQLite en `data/grupos.db`.
- Frontend: React 19 + TypeScript + Vite + Material UI, en `frontend/`.
- Autenticación: JWT; middleware en `middleware/auth.js`.
- Imagen de producción: `Dockerfile` multi-stage (compila frontend y sirve el resultado desde Express).

## Entidades y reglas funcionales

### Usuarios (`personas`)

- Campos habituales: nombre, apellidos, email, teléfono, puesto y observaciones.
- `es_admin = 1` identifica administradores.
- Un usuario ordinario se crea sin contraseña y no puede autenticarse. Puede formar parte de grupos.
- Un administrador requiere contraseña y puede iniciar sesión.
- No se puede eliminar el último administrador; sí se puede borrar un administrador cuando existe al menos otro.
- El administrador inicial se garantiza al arrancar con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Cambiar el email crea/actualiza ese administrador, no renombra el anterior.

### Grupos (`grupos`)

- Campos: `nombre`, `descripcion`, `fecha_creacion`.
- La fecha de creación se puede indicar y modificar en el formulario; se inicializa con la fecha actual.
- Borrar un grupo elimina en cascada sus membresías y reuniones asociadas.

### Membresías (`miembros`)

- Relacionan persona y grupo, con `fecha_inicio`, `fecha_fin` y `activo`.
- Dar de baja no borra el registro: establece fecha de fin y marca la membresía inactiva.
- Por defecto, la API devuelve miembros activos. `GET /api/miembros?...&incluirHistorico=true` devuelve activos e inactivos.
- En `MiembrosGrupo`, la casilla “Mostrar miembros inactivos” debe cargar el histórico completo; desactivada muestra solo los activos.

### Reuniones y asistencias

- Reuniones: grupo, fecha, hora, ubicación y descripción.
- Asistencias: una por persona y reunión, con estados `asistio`, `no_asistio` o `excusa`, y observaciones.
- Las convocatorias se envían por SMTP a todos los miembros activos con email del grupo, permiten adjuntos y registran cada envío.
- El formulario de reunión incluye solo miembros cuya membresía estaba vigente en la fecha de la reunión.
- Las migraciones de arranque comprueban columnas antiguas de `asistencias` (`estado`, `observaciones`, `updated_at`). No usar `updated_at` en `reuniones`: esa columna no existe en dicha tabla.

## Seguridad y API

- `POST /api/auth/login` es público. El resto de `/api` exige JWT.
- Las operaciones de escritura exigen además `requireAdmin`.
- La API del frontend se centraliza en `frontend/src/services/api.ts`; las reuniones usan además `frontend/src/services/reunionesApi.ts`.
- No devolver hashes de contraseña en las consultas de usuarios.

## Desarrollo local

Dos terminales, sin Docker:

```bash
npm install
npm start

cd frontend
npm install
npm run dev
```

- Backend: `http://localhost:3001`.
- Frontend Vite: normalmente `http://localhost:5173`.
- Si el puerto 3001 está ocupado por Docker: `docker compose down` antes de ejecutar `npm start`.

## Docker y despliegue

- `compose.yaml` publica por defecto solo en localhost: `127.0.0.1:${APP_PORT:-3101}:3001`.
- Es apropiado para un Nginx del host que haga proxy a `/comites/`.
- `VITE_BASE_PATH` y `VITE_API_URL` son variables de compilación; cambiar cualquiera obliga a reconstruir la imagen.
- Variables mínimas en `.env`: `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `APP_PORT`, `VITE_BASE_PATH`, `VITE_API_URL`. Usar `.env.example` como modelo y nunca versionar `.env`.
- Para convocatorias hay que definir `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` y `SMTP_FROM`.

Despliegue tras actualizar el código:

```bash
docker compose up --build -d
```

Los datos persisten en el volumen Docker `grupos-data`. No eliminarlo salvo que se quiera borrar la base de datos.

## Verificación habitual

```bash
docker compose build
docker compose ps
docker compose logs --tail=100 app
```

El build ejecuta `npm ci` y `npm run build` en el frontend, por lo que detecta errores de TypeScript.
