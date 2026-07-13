# Ejecución con Docker

El contenedor construye el cliente React y lo sirve desde la misma aplicación Express que expone la API. La base de datos SQLite se conserva en el volumen Docker `grupos-data`.

## Configuración

Copie `.env.example` como `.env` en la raíz del proyecto y sustituya sus valores de ejemplo:

```bash
cp .env.example .env
chmod 600 .env
```

El archivo incluye una configuración base como esta:

```env
JWT_SECRET=una_clave_larga_aleatoria
ADMIN_EMAIL=admin@example.org
ADMIN_PASSWORD=elige_una_contrasena_segura
# Opcional: puerto local publicado en el host (por defecto, 3101)
APP_PORT=3101
```

El usuario administrador se crea o actualiza al arrancar la aplicación con el correo y contraseña configurados arriba.

Para servir la aplicación desde Nginx bajo `/comites/`, añada también:

```env
VITE_BASE_PATH=/comites/
VITE_API_URL=/comites
```

Estas variables se incluyen al compilar el cliente; reconstruya la imagen después de modificarlas.

## Arranque

```bash
docker compose up --build -d
```

Abra `http://localhost:3001` (o el valor configurado en `APP_PORT`). Para ver el arranque de la aplicación:

```bash
docker compose logs -f app
```

## Operaciones habituales

```bash
# Detener los contenedores y conservar los datos
docker compose down

# Eliminar también la base de datos persistida (acción irreversible)
docker compose down -v
```

## Transferencia desde Windows

El script `scripts/Publish-DockerPackage.ps1` crea un paquete del código y lo sube mediante SCP. No incluye `.env`, la base de datos, `node_modules` ni las compilaciones locales.

```powershell
.\scripts\Publish-DockerPackage.ps1 -Server 10.36.160.121 -User franz
```

El paquete llega al directorio personal del usuario. En el servidor, extráelo en `/opt/huca-comites`, conserva allí el archivo `.env` de producción y reconstruye el servicio:

```bash
sudo mkdir -p /opt/huca-comites
sudo chown franz:franz /opt/huca-comites
tar -xzf ~/huca-comites.tar.gz -C /opt/huca-comites
cd /opt/huca-comites
docker compose up --build -d
```
