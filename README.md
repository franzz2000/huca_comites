# Gestión de Comités

Aplicación web para administrar comités o grupos de trabajo, sus integrantes y las reuniones celebradas. Permite registrar la asistencia de cada miembro y consultar estadísticas por grupo.

## Funcionalidad

- Autenticación mediante correo electrónico y JWT.
- Gestión de múltiples cuentas administradoras, con operaciones de modificación protegidas por rol.
- Alta, edición, búsqueda y eliminación de grupos.
- Gestión de usuarios, con datos de contacto, puesto y observaciones.
- Asociación de usuarios a grupos, con fechas de inicio y fin de pertenencia, y estado activo.
- Creación, edición y eliminación de reuniones por grupo.
- Registro de asistencia, excusa o inasistencia para cada reunión.
- Consulta de estadísticas de asistencia de cada usuario dentro de un grupo.

## Arquitectura

| Capa | Tecnología | Responsabilidad |
| --- | --- | --- |
| Cliente | React 19, TypeScript, Vite y Material UI | Interfaz de administración y sesión del usuario. |
| API | Node.js, Express | API REST y validación de las operaciones. |
| Persistencia | SQLite (`data/grupos.db`) | Usuarios, grupos, miembros, reuniones y asistencias. |
| Seguridad | `bcryptjs` y JSON Web Tokens | Hash de contraseñas y protección de rutas `/api`. |

El backend crea automáticamente las tablas necesarias al iniciarse. La interfaz conserva la sesión en `localStorage` y envía el token como `Authorization: Bearer <token>`.

## Requisitos

- Node.js 18 o superior.
- npm.

## Puesta en marcha local

1. Instala las dependencias del backend:

   ```bash
   npm install
   ```

2. Configura las variables de entorno en `.env`:

   ```env
   PORT=3001
   JWT_SECRET=usa_una_clave_larga_y_aleatoria
   ```

3. En otra terminal, instala las dependencias del cliente y arráncalo:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. Desde la raíz, inicia la API:

   ```bash
   npm start
   ```

Vite mostrará la URL del cliente (normalmente `http://localhost:5173`). La API escucha en `http://localhost:3001` de forma predeterminada. El cliente tiene esta URL configurada directamente en `frontend/src/services/api.ts` y `frontend/src/services/authService.ts`.

Para desarrollo del backend se puede usar:

```bash
npm run dev
```

## Datos y usuario inicial

La base de datos se guarda en `data/grupos.db`. Al iniciar, `scripts/createAdminUser.js` crea o actualiza un usuario administrador definido actualmente en ese archivo. Antes de desplegar la aplicación, modifica sus credenciales predeterminadas y establece un `JWT_SECRET` seguro. No subas al repositorio una base de datos ni un archivo `.env` con datos reales.

## API principal

Todas las rutas siguientes, salvo el inicio de sesión, requieren un token Bearer válido.

| Recurso | Rutas |
| --- | --- |
| Sesión | `POST /api/auth/login` |
| Grupos | `GET`, `POST /api/grupos`; `PUT`, `DELETE /api/grupos/:id` |
| Usuarios | `GET`, `POST /api/usuarios`; `GET`, `PUT`, `DELETE /api/usuarios/:id` |
| Miembros | `GET`, `POST /api/miembros`; `PUT`, `DELETE /api/miembros/:id` |
| Reuniones | `GET`, `POST /api/reuniones`; `GET`, `PUT`, `DELETE /api/reuniones/:id` |
| Asistencias | `POST /api/reuniones/:id/asistencias` |
| Estadísticas | `GET /api/usuarios/:usuarioId/grupos/:grupoId/estadisticas` |

## Estructura del proyecto

```text
.
├── app.js                 # API Express y creación del esquema SQLite
├── middleware/auth.js     # Verificación de JWT
├── scripts/createAdminUser.js
├── data/grupos.db         # Base de datos local
└── frontend/
    └── src/
        ├── components/    # Grupos, usuarios, miembros y reuniones
        ├── contexts/      # Estado de autenticación
        ├── pages/         # Inicio de sesión
        └── services/      # Clientes de la API
```

## Comprobaciones disponibles

En el cliente:

```bash
cd frontend
npm run lint
npm run build
```

## Docker

La aplicación se puede arrancar completa (cliente, API y SQLite) con Docker Compose. Consulta [README.Docker.md](README.Docker.md) para configurar las credenciales iniciales y ejecutar:

```bash
docker compose up --build -d
```

## Despliegue en `10.36.160.121`

El servidor solo expone el puerto 80 y ya tiene una aplicación en la ruta `/`. Este proyecto se publica bajo `http://10.36.160.121/comites/`.

### 1. Subir el código desde Windows

El script de empaquetado excluye `.env`, la base SQLite, Git, `node_modules` y las compilaciones locales:

```powershell
.\scripts\Publish-DockerPackage.ps1 -Server 10.36.160.121 -User franz
```

### 2. Instalar o actualizar en el servidor

Conéctate como `franz` y ejecuta:

```bash
mkdir -p ~/docker/huca_comites
tar -xzf ~/huca-comites.tar.gz -C ~/docker/huca_comites
cd ~/docker/huca_comites
```

Crea el archivo `.env` únicamente en el servidor a partir de la plantilla y establece un secreto JWT y credenciales de administrador seguros:

```bash
cp .env.example .env
chmod 600 .env
```

```env
JWT_SECRET=una_clave_larga_y_aleatoria
ADMIN_EMAIL=administrador@ejemplo.es
ADMIN_PASSWORD=una-contrasena-segura
VITE_BASE_PATH=/comites/
VITE_API_URL=/comites
```

`VITE_BASE_PATH` y `VITE_API_URL` se incorporan al cliente durante la compilación. Por ello, después de cambiarlas hay que reconstruir la imagen.

Después, construye e inicia el servicio:

```bash
docker compose up --build -d
curl -I http://127.0.0.1:3101
```

La última orden debe devolver `HTTP/1.1 200 OK`.

### 3. Configurar Nginx

```nginx
location = /comites {
    return 301 /comites/;
}

location /comites/ {
    proxy_pass http://127.0.0.1:3101/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Añade esos bloques dentro del `server` de `/etc/nginx/sites-available/default`, antes de `location /`. Comprueba la sintaxis antes de recargar Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

El acceso final será `http://10.36.160.121/comites/`. Para actualizar la aplicación, repite el empaquetado y la transferencia, extrae el archivo sobre `~/docker/huca_comites` y ejecuta `docker compose up --build -d`. No ejecutes `docker compose down -v`, pues eliminaría la base de datos persistida.
