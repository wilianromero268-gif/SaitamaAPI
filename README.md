# SaitamaAPI PRO
Dashboard premium responsive, API keys `sai_...`, límite de 500 solicitudes diarias por clave, métricas globales, tarjetas de endpoints y documentación automática. Backend: Cloudflare Workers + D1.

## Instalar y desplegar desde Termux
1. Descomprime el ZIP, entra a la carpeta y ejecuta `npm install`.
2. Inicia sesión en Cloudflare: `npx wrangler login`.
3. Crea D1: `npx wrangler d1 create saitamaapi-db`.
4. Copia el `database_id` devuelto y reemplaza `PEGA_AQUI_EL_ID_DE_TU_D1` en `wrangler.toml`.
5. Crea las tablas: `npx wrangler d1 execute saitamaapi-db --remote --file=./schema.sql`.
6. Define un token administrador privado: `npx wrangler secret put ADMIN_TOKEN` y escribe un token largo cuando te lo pida.
7. Publica: `npm run deploy`.

La URL `workers.dev` aparece al terminar. Para conservar `saitamaapi.wilianromero268.workers.dev`, despliega con el nombre de Worker correspondiente en tu cuenta de Cloudflare.

## Uso
- En la web pulsa **Generar API Key**. Se muestra una vez; guárdala.
- Cada key puede realizar hasta 500 solicitudes al día UTC.
- Para registrar endpoints, usa el formulario de la web y el `ADMIN_TOKEN` configurado como secreto. Solo admite upstream HTTPS.
- Lista de endpoints: `GET /api/docs`.
- Ejemplo: `curl -H 'x-api-key: sai_TU_CLAVE' 'https://TU-WORKER.workers.dev/api/run/ytsearch?q=Saitama'`.
- Consumo: `GET /api/keys/current` con `x-api-key`.
- Estadísticas globales: `GET /api/stats` con `x-api-key`.

Las respuestas incluyen `creator: "SAI"`, `status` y, en metadatos, `year: 2026`. El contador de usuarios representa claves activas, no personas verificadas. El límite de 500 es de la aplicación; las cuotas del plan Cloudflare siguen aplicando. Añade únicamente APIs externas que tengas autorización para usar.
