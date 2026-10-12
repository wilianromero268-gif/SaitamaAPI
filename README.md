# SaitamaAPI PRO

Panel de API para Cloudflare Workers + D1. Incluye dashboard adaptable, registro/inicio de sesión por correo, soporte opcional para Google OAuth, API keys personales `sai_...`, límite diario por usuario, rol administrador, CRUD de endpoints y documentación dinámica.

## Funciones

- Registro e inicio de sesión con correo y contraseña (mínimo 8 caracteres).
- Inicio de sesión con Google opcional cuando `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` estén configurados.
- Claves `sai_...`; la clave completa se enseña una sola vez al generarse.
- Usuarios normales: 450 solicitudes diarias por defecto. Admins: sin límite diario.
- El administrador definido en `ADMIN_EMAILS` puede crear/eliminar endpoints.
- Panel de uso y errores diarios, documentación generada desde los endpoints.
- Respuestas API con `status`, `creator: "SAI"` y `year: 2026`.

## 1. Preparar D1

En Cloudflare Dashboard abre **Workers & Pages → D1 SQL Database** y selecciona la base de datos `1234`. Abre **Console** y ejecuta el contenido de `schema.sql`.

En Settings/Bindings de tu Worker, confirma que la base de datos está vinculada con el nombre de variable `DB`.

## 2. Configurar variables de Worker

En `wrangler.toml`, reemplaza:

- `database_id`: el ID real de tu base de datos D1.
- `ADMIN_EMAILS`: el Gmail que tendrá permisos de administrador.

En Cloudflare Dashboard también puedes configurar estas variables en **Workers & Pages → saitamaapi → Settings → Variables and Secrets**:

- `APP_ORIGIN` (variable): `https://saitamaapi.wilianromero268.workers.dev`
- `DAILY_LIMIT` (variable): `450`
- `ADMIN_EMAILS` (variable): tu correo administrador
- `GOOGLE_CLIENT_ID` (secret): Client ID de Google OAuth
- `GOOGLE_CLIENT_SECRET` (secret): Client Secret de Google OAuth

Los dos secretos de Google son opcionales para desplegar: mientras no estén configurados, se puede entrar con correo y contraseña. El botón de Google se activará cuando ambos secretos existan.

## 3. Google OAuth (opcional)

En Google Cloud crea un OAuth Client ID de tipo **Web application**. Configura:

- Authorized JavaScript origin: `https://saitamaapi.wilianromero268.workers.dev`
- Authorized redirect URI: `https://saitamaapi.wilianromero268.workers.dev/auth/google/callback`

Guarda el Client ID y el Client Secret como secretos de Worker, nunca en `public/js/app.js` ni en el repositorio. Si Google Cloud bloquea el acceso a tu cuenta, usa por ahora el registro por correo; no intentes saltarte las restricciones de la cuenta.

## 4. Subir a GitHub desde Termux

Extrae el ZIP y entra a la carpeta del proyecto:

```bash
cd ~/downloads/SaitamaAPI-PRO/SaitamaAPI-PRO
npm install
```

Copia los archivos del ZIP sobre la carpeta del proyecto (conserva tu copia original antes de reemplazar archivos). Revisa `wrangler.toml` y confirma que el `database_id` sea el correcto.

## 5. Publicar

La forma recomendada para tu entorno Android es conectar el repositorio de GitHub a Cloudflare Workers y desplegar desde Cloudflare Dashboard. Wrangler/workerd puede no instalarse en algunas versiones de Termux.

En Cloudflare:
1. Abre el Worker `saitamaapi`.
2. Sube el proyecto o conecta el repositorio.
3. Comprueba la configuración de D1 y variables.
4. Ejecuta el SQL de `schema.sql` en D1.
5. Publica y abre `https://saitamaapi.wilianromero268.workers.dev/`.

## 6. Probar la API

`/api/health` es una comprobación pública. Para los endpoints de datos, genera una API key desde el dashboard y envíala así:

```bash
curl -H "x-api-key: sai_TU_CLAVE" \
  "https://saitamaapi.wilianromero268.workers.dev/api/ping"
```

Respuesta de ejemplo:

```json
{
  "status": true,
  "creator": "SAI",
  "year": 2026,
  "message": "Pong",
  "name": "SaitamaAPI PRO"
}
```

## Importante

- Nunca subas secretos reales al repositorio.
- Las claves API se almacenan como hashes; la clave completa no puede recuperarse desde el panel después de generarla.
- La URL externa de cada endpoint debe usar HTTPS.
- Cambia `ADMIN_EMAILS` antes de desplegar. No uses un Gmail que no controles.
- Este proyecto es una base de producción inicial; antes de exponerlo ampliamente, prueba registro, login, límites, rotación de claves y endpoints en un entorno controlado.
