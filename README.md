# SaitamaAPI MAX PLUS — web dashboard

Proyecto Cloudflare Workers + D1, con inicio de sesión Google, perfil, API key automática, estadísticas diarias, panel de administrador, catálogo de endpoints, probador de API y reproductor de audio para URLs directas.

## Importante
- Este ZIP es una base nueva para desplegar. No incluye claves ni credenciales.
- No reemplaces tu D1 antigua hasta comprobar el nuevo despliegue.
- Las rutas `/api/ytsearch` y `/api/download` necesitan un proveedor real/configurado; no prometen descargas que no estén conectadas.
- La API key completa se entrega una sola vez cuando se crea. El dashboard muestra el prefijo después; usa regenerar si la pierdes.
- El panel admin se asigna cuando `ADMIN_EMAIL` coincide con el correo de Google verificado.
- `SESSION_SECRET` es requerido para configuración y debe ser secreto. No se publica en HTML ni se imprime.

## 1. Crear la D1
En Cloudflare Dashboard → Storage & databases → D1 SQL Database → Create database.
Nombre sugerido: `saitamaapi-max-plus-db`.
Copia su Database ID.

## 2. Configurar wrangler.toml
Reemplaza:
- `database_id = "REEMPLAZA_CON_EL_DATABASE_ID_DE_TU_D1"`
- `APP_ORIGIN = "https://TU-WORKER.workers.dev"`
- `ADMIN_EMAIL = "tu-correo@gmail.com"`

Conserva `binding = "DB"`.

## 3. Crear tablas
En la consola SQL de la D1 nueva, ejecuta todo `migrations/0001_init.sql`.

## 4. Configurar variables en el Worker
En Settings → Variables and Secrets, crea:
- `GOOGLE_CLIENT_ID` (Text)
- `GOOGLE_CLIENT_SECRET` (Secret)
- `APP_ORIGIN` (Text, dominio real sin barra final)
- `SESSION_SECRET` (Secret; crea uno aleatorio)
- `ADMIN_EMAIL` (Text; correo administrador)

La URI autorizada de redirección de Google debe ser:
`https://TU-WORKER.workers.dev/auth/google/callback`

## 5. Desplegar
Sube los archivos al repositorio y despliega el Worker con Cloudflare. Si usas Wrangler desde un entorno compatible:
`npx wrangler deploy`

Para publicar el esquema con Wrangler:
`npx wrangler d1 execute saitamaapi-max-plus-db --remote --file=migrations/0001_init.sql`

Si ejecutas el SQL desde el panel de D1, no es necesario correr ese comando.

## 6. Proveedor de búsqueda
Para activar `/api/ytsearch`, configura la variable `YTSEARCH_URL` con la URL de tu propio servicio/proveedor que acepte `q` y `limit`. El endpoint envía ambos parámetros y devuelve `results`, `data` o el cuerpo JSON recibido.

## Endpoints incluidos
- `GET /api/ping` público
- `GET /api/info` público
- `GET /api/endpoints` público
- `GET /api/random?min=1&max=100` requiere API key
- `GET /api/uuid` requiere API key
- `GET /api/time` requiere API key
- `GET /api/text?text=Hola` requiere API key
- `GET /api/base64/encode?text=Hola` requiere API key
- `GET /api/base64/decode?text=SG9sYQ%3D%3D` requiere API key
- `GET /api/ytsearch?q=Shakira` requiere API key y `YTSEARCH_URL`
- `GET /api/download?url=...` requiere API key y todavía necesita conectar un proveedor autorizado

## Seguridad
No publiques `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET` ni tu API key. El endpoint de rotación revoca la clave anterior. El detalle de excepciones internas no se devuelve al navegador.
