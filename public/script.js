// ========================================
// SAITAMA API - API TESTER
// ========================================

const API_CONFIG = {

    ytmp3: {
        endpoint: "/saitama/api/ytmp3",
        parameter: "url",
        placeholder: "https://youtube.com/watch?v=..."
    },

    ytmp4: {
        endpoint: "/saitama/api/ytmp4",
        parameter: "url",
        placeholder: "https://youtube.com/watch?v=..."
    },

    play: {
        endpoint: "/saitama/api/play",
        parameter: "q",
        placeholder: "Nombre de la canción"
    },

    play2: {
        endpoint: "/saitama/api/play2",
        parameter: "q",
        placeholder: "Nombre del video"
    },

    ytsearch: {
        endpoint: "/saitama/api/ytsearch",
        parameter: "q",
        placeholder: "Buscar en YouTube"
    },

    tiktokdl: {
        endpoint: "/saitama/api/tiktokdl",
        parameter: "url",
        placeholder: "https://www.tiktok.com/@usuario/video/..."
    },

    tiktoksearch: {
        endpoint: "/saitama/api/tiktoksearch",
        parameter: "q",
        placeholder: "Buscar en TikTok"
    },

    facebookdl: {
        endpoint: "/saitama/api/facebookdl",
        parameter: "url",
        placeholder: "https://www.facebook.com/..."
    },

    instagramdl: {
        endpoint: "/saitama/api/instagramdl",
        parameter: "url",
        placeholder: "https://www.instagram.com/..."
    },

    spotifysearch: {
        endpoint: "/saitama/api/spotifysearch",
        parameter: "q",
        placeholder: "Nombre de la canción"
    },

    spotifymp3: {
        endpoint: "/saitama/api/spotifymp3",
        parameter: "url",
        placeholder: "https://open.spotify.com/track/..."
    },

    pinterest: {
        endpoint: "/saitama/api/pinterest",
        parameter: "url",
        placeholder: "https://www.pinterest.com/..."
    },

    ai: {
        endpoint: "/saitama/api/ai",
        parameter: "q",
        placeholder: "Escribe algo para Saitama AI"
    },

    apk: {
        endpoint: "/saitama/api/apk",
        parameter: "q",
        placeholder: "Nombre de la aplicación"
    }

};


// ========================================
// ELEMENTOS
// ========================================

const endpointInput =
    document.getElementById("endpoint");

const parameterInput =
    document.getElementById("parameter");

const apiKeyInput =
    document.getElementById("apikey");

const responseBox =
    document.getElementById("response");


// ========================================
// API KEY AUTOMÁTICA
// ========================================

async function loadApiKey() {

    try {

        const response =
            await fetch("/saitama/api/config");

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        if (
            data.status &&
            data.apikey
        ) {

            apiKeyInput.value =
                data.apikey;

        }

    } catch (error) {

        console.error(
            "No se pudo cargar la API key:",
            error
        );

    }

}


// ========================================
// PROBAR API
// ========================================

function testAPI(name) {

    const api =
        API_CONFIG[name];

    if (!api) {

        showResponse({

            status: false,

            code: 404,

            error: "API no encontrada"

        });

        return;

    }


    endpointInput.value =
        api.endpoint;


    parameterInput.value = "";


    parameterInput.placeholder =
        api.placeholder;


    parameterInput.dataset.name =
        api.parameter;


    const methodElement =
        document.getElementById("method");

    if (methodElement) {

        methodElement.textContent =
            "GET";

    }


    document
        .getElementById("tester")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    setTimeout(() => {

        parameterInput.focus();

    }, 500);

}


// ========================================
// EJECUTAR PETICIÓN
// ========================================

async function sendRequest() {

    const endpoint =
        endpointInput.value.trim();

    const parameter =
        parameterInput.value.trim();

    let apiKey =
        apiKeyInput.value.trim();


    if (!endpoint) {

        showResponse({

            status: false,

            code: 400,

            error: "Introduce un endpoint."

        });

        return;

    }


    if (!parameter) {

        showResponse({

            status: false,

            code: 400,

            error: "Introduce un parámetro."

        });

        parameterInput.focus();

        return;

    }


    // Si no existe la API key,
    // intentamos cargarla automáticamente.

    if (!apiKey) {

        await loadApiKey();

        apiKey =
            apiKeyInput.value.trim();

    }


    if (!apiKey) {

        showResponse({

            status: false,

            code: 500,

            error: "API key no disponible",

            message:
                "No se pudo obtener la API key desde el servidor."

        });

        return;

    }


    responseBox.textContent =
        "Ejecutando petición...";


    try {

        const parameterName =
            parameterInput.dataset.name ||
            "q";


        const params =
            new URLSearchParams();


        params.set(
            parameterName,
            parameter
        );


        params.set(
            "apikey",
            apiKey
        );


        const separator =
            endpoint.includes("?")
                ? "&"
                : "?";


        const url =
            endpoint +
            separator +
            params.toString();


        const response =
            await fetch(url, {
                method: "GET",
                headers: {
                    "Accept":
                        "application/json"
                }
            });


        const contentType =
            response.headers
                .get("content-type") || "";


        let data;


        if (
            contentType.includes(
                "application/json"
            )
        ) {

            data =
                await response.json();

        } else {

            const text =
                await response.text();


            data = {

                status:
                    response.ok,

                code:
                    response.status,

                response:
                    text

            };

        }


        showResponse(data);


        // Actualizar estadísticas
        if (
            typeof loadStats === "function"
        ) {

            loadStats();

        }


    } catch (error) {

        showResponse({

            status: false,

            code: 500,

            error:
                "No se pudo conectar con la API.",

            detail:
                error.message

        });

    }

}


// ========================================
// MOSTRAR JSON
// ========================================

function showResponse(data) {

    try {

        responseBox.textContent =
            JSON.stringify(
                data,
                null,
                2
            );

    } catch {

        responseBox.textContent =
            String(data);

    }

}


// ========================================
// ESTADÍSTICAS
// ========================================

async function loadStats() {

    try {

        const response =
            await fetch(
                "/saitama/api/stats"
            );


        if (!response.ok) {
            return;
        }


        const data =
            await response.json();


        if (
            !data.status ||
            !data.data
        ) {

            return;

        }


        const stats =
            data.data;


        const total =
            document.getElementById(
                "total-requests"
            );


        const today =
            document.getElementById(
                "today-requests"
            );


        const status =
            document.getElementById(
                "api-status"
            );


        if (total) {

            total.textContent =
                Number(
                    stats.total || 0
                ).toLocaleString();

        }


        if (today) {

            today.textContent =
                Number(
                    stats.today || 0
                ).toLocaleString();

        }


        if (status) {

            status.textContent =
                "ONLINE";

        }

    } catch {

        const status =
            document.getElementById(
                "api-status"
            );


        if (status) {

            status.textContent =
                "OFFLINE";

        }

    }

}


// ========================================
// ENTER PARA EJECUTAR
// ========================================

parameterInput?.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            sendRequest();

        }

    }
);


endpointInput?.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            parameterInput.focus();

        }

    }
);


// ========================================
// INICIO
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadApiKey();

        loadStats();

        setInterval(
            loadStats,
            10000
        );

    }
);


console.log(
    "Saitama API Tester iniciado."
);
