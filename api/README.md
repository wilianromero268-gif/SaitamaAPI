# Módulos de API

Coloca cada integración en su propio archivo aquí (por ejemplo `ytsearch.js`, `weather.js`). Importa el módulo desde `src/worker.js` y llama al proveedor únicamente después de validar la API key y aplicar la cuota diaria. No guardes credenciales en el frontend ni en Git.
