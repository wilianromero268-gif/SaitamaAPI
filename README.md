# SaitamaAPI PRO

Dashboard de API para Cloudflare Workers + D1. Incluye frontend responsive, registro por correo/contraseña, inicio de sesión Google OAuth, sesiones con cookie HttpOnly, gestión de API keys `sai_...`, cuota diaria validada en el servidor y documentación inicial.

> Este paquete es una base de proyecto completa para desplegar y ampliar. No incluye claves OAuth ni proveedores de APIs de terceros. `/api/ytsearch` es una ruta de integración de ejemplo (responde 501 hasta conectar un proveedor).

## Requisitos

- Cuenta Cloudflare con Workers y D1.
- Node.js 20+ y npm para ejecutar Wrangler.
- Para Google login: proyecto en Google Cloud con OAuth Client ID tipo Web application.

## 1. Instalar

```bash
npm install
```

## 2. Crear base de datos D1

```bash
npx wrangler d1 create saitamaapi-db
```

Copia el `database_id` que devuelve el comando y reemplaza `REEMPLAZA_CON_TU_DATABASE_ID` en `wrangler.toml`.

Inicializa la base remota:

```bash
npm run db:remote
```

Para desarrollo local usa `npm run db:local`.

## 3. Configurar URL pública

En `wrangler.toml`, cambia `APP_ORIGIN` por la URL exacta del Worker, por ejemplo `https://saitamaapi-pro.TUUSUARIO.workers.dev`. Debe coincidir exactamente con la URL que registres en Google OAuth.

## 4. Google OAuth (opcional)

En Google Cloud Console, crea un OAuth Client ID de tipo **Web application**. Añade como URI de redirección autorizada:

`https://TU-WORKER.workers.dev/auth/google/callback`

Guarda las credenciales como secretos de Worker (no las escribas en el repositorio):

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
```

Pega el valor correspondiente cuando Wrangler lo solicite. Sin estos secretos, el botón Google mostrará un aviso de configuración.

## 5. Ejecutar y publicar

```bash
npm run dev
npm run deploy
```

Antes de publicar, confirma que D1 está creado, la migración se aplicó y `APP_ORIGIN` corresponde a la URL final.

## Rutas incluidas

### Cuenta

- `POST /auth/register` — `{ "name": "Nombre", "email": "correo@ejemplo.com", "password": "mínimo 8 caracteres" }`
- `POST /auth/login` — `{ "email": "correo@ejemplo.com", "password": "..." }`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/google` — inicia OAuth cuando está configurado.
- `GET /auth/google/callback`

### Usuario autenticado (sesión)

- `GET /api/dashboard/summary`
- `POST /api/keys` — `{ "label": "Mi clave" }`; devuelve la clave completa una sola vez.
- `DELETE /api/keys/:id` — revoca una clave.

### API con clave

Envía la clave en `Authorization: Bearer sai_TU_CLAVE`.

- `GET /api/test` — prueba de clave.
- `GET /api/ytsearch?q=consulta` — esqueleto de integración; conectar proveedor en el Worker para habilitarlo.
- `GET /health` — estado básico del Worker.

## Cuota y seguridad

- El límite por defecto es 295 solicitudes por usuario y día UTC. Ajusta `DAILY_LIMIT` en `wrangler.toml`.
- El conteo se incrementa en D1 en el Worker; no depende del navegador.
- Hasta 5 claves activas por cuenta; las claves se guardan como hash y solo se muestran al crearlas.
- Las contraseñas se derivan con PBKDF2/SHA-256 y salt individual.
- Las sesiones usan cookies `HttpOnly`, `Secure` y `SameSite=Lax`.
- Para producción, añade protección contra intentos repetidos de login/registro, verificación de correo, política de privacidad, backups y monitoreo de abuso.

## Añadir proveedores/endpoints

Agrega tu lógica de proveedor en `src/worker.js` dentro de la función `api()` o separa cada endpoint en módulos dentro de `api/`. Mantén la autenticación de API key y la cuota antes de ejecutar la lógica del proveedor. No pongas secretos de proveedores en el frontend.
