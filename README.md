# SaitamaAPI
API Cloudflare Workers + D1. Creator: SAI · 2026.

## Características
- 450 solicitudes/día por clave activa.
- Una sola API key activa a la vez.
- Formato `sai_...`.
- Sin registro de usuarios.
- Dashboard con uso, errores y logs.
- Endpoints separados en `src/endpoints/`.
- Validación central de API key.

## Instalación
1. Crea una D1 y pega su ID en `wrangler.toml`.
2. Ejecuta `schema.sql` en esa D1.
3. En Cloudflare configura el secret `DASHBOARD_SECRET`.
4. Despliega con Cloudflare Git o Wrangler.
5. Abre `/`, escribe el secret y genera la primera clave.

## Usar la API
`x-api-key: sai_...` o `Authorization: Bearer sai_...` o `?apikey=sai_...`.

Añadir endpoint: crea `src/endpoints/nombre.js` y agrégalo en `src/endpoints/index.js`. La validación y el límite se aplican automáticamente.
