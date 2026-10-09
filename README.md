# SaitamaAPI PRO — SaiDev145

Dashboard para Cloudflare Workers + D1. Incluye login con cookie de sesión segura, una API Key activa con prefijo `sai_`, límite de 500 solicitudes por día UTC, estadísticas y administración de endpoints externos HTTPS.

## Antes de desplegar

1. Instala Node.js y ejecuta `npm install`.
2. Inicia sesión: `npx wrangler login`.
3. Revisa `wrangler.toml`: contiene el nombre/ID de D1 indicado en la configuración anterior. Confirma que esa base es la correcta antes de ejecutar comandos remotos.
4. Inicializa las tablas en D1: `npx wrangler d1 execute 1234 --remote --file=./schema.sql`.
5. Configura secretos (no los pongas en el código ni los compartas):
   - `npx wrangler secret put ADMIN_PASSWORD`
   - `npx wrangler secret put SESSION_SECRET` (usa una cadena aleatoria larga y distinta).
6. Despliega: `npx wrangler deploy`.

## Uso

Crea un endpoint en el dashboard, por ejemplo `ytsearch`, y llama a:

```bash
curl -H "x-api-key: sai_TU_CLAVE" "https://TU-WORKER.workers.dev/api/run/ytsearch?q=Shakira"
```

La API Key completa se muestra una sola vez al generarla. Si la pierdes, elimínala y genera otra. Solo configura APIs externas que tengas permiso para utilizar.

## Notas

- El límite de 500 solicitudes se aplica a la API Key activa por día UTC.
- El contador de solicitudes de hoy del dashboard es el total global de todas las claves.
- Si ya tienes una base D1 con datos, haz copia de seguridad antes de inicializar el esquema.
