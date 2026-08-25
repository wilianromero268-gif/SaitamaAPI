// ========================================
// SAITAMA API - API TESTER
// ========================================

const API_CONFIG = {

    ytmp3: {
        endpoint: "/api/ytmp3",
        parameter: "url",
        placeholder: "https://youtube.com/watch?v=..."
    },

    ytmp4: {
        endpoint: "/api/ytmp4",
        parameter: "url",
        placeholder: "https://youtube.com/watch?v=..."
    },

    play: {
        endpoint: "/api/play",
        parameter: "q",
        placeholder: "Nombre de la canción"
    },

    play2: {
        endpoint: "/api/play2",
        parameter: "q",
        placeholder: "Nombre del video"
    },

    ytsearch: {
        endpoint: "/api/ytsearch",
        parameter: "q",
        placeholder: "Buscar en YouTube"
    },

    tiktokdl: {
        endpoint: "/api/tiktokdl",
        parameter: "url",
        placeholder: "https://www.tiktok.com/@usuario/video/..."
    },

    tiktoksearch: {
        endpoint: "/api/tiktoksearch",
        parameter: "q",
        placeholder: "Buscar en TikTok"
    },

    facebookdl: {
        endpoint: "/api/facebookdl",
        parameter: "url",
        placeholder: "https://www.facebook.com/..."
    },

    instagramdl: {
        endpoint: "/api/instagramdl",
        parameter: "url",
        placeholder: "https://www.instagram.com/..."
    },

    spotifysearch: {
        endpoint: "/api/spotifysearch",
        parameter: "q",
        placeholder: "Nombre de la canción"
    }

};


// ========================================
// ELEMENTOS
// ========================================

const endpointInput = document.getElementById("endpoint");
const parameterInput = document.getElementById("parameter");
const apiKeyInput = document.getElementById("apikey");
const responseBox = document.getElementById("response");


// ========================================
// PROBAR API
// ========================================

function testAPI(name) {

    const api = API_CONFIG[name];

    if (!api) {
        showResponse({
            status: false,
            error: "API no encontrada"
        });

        return;
    }

    endpointInput.value = api.endpoint;

    parameterInput.value = "";

    parameterInput.placeholder = api.placeholder;

    parameterInput.dataset.name = api.parameter;

    document
        .getElementById("tester")
        .scrollIntoView({
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

    const endpoint = endpointInput.value.trim();

    const parameter = parameterInput.value.trim();

    const apiKey = apiKeyInput.value.trim();

    if (!endpoint) {

        showResponse({
            status: false,
            error: "Introduce un endpoint."
        });

        return;
    }


    if (!parameter) {

        showResponse({
            status: false,
            error: "Introduce un parámetro."
        });

        parameterInput.focus();

        return;
    }


    responseBox.textContent = "Ejecutando petición...";


    try {

        const parameterName =
            parameterInput.dataset.name || "q";


        const params = new URLSearchParams();

        params.set(
            parameterName,
            parameter
        );


        if (apiKey) {

            params.set(
                "apikey",
                apiKey
            );

        }


        const url =
            endpoint +
            "?" +
            params.toString();


        const response =
            await fetch(url);


        const contentType =
            response.headers.get("content-type") || "";


        let data;


        if (contentType.includes("application/json")) {

            data = await response.json();

        } else {

            const text =
                await response.text();

            data = {
                status: response.ok,
                response: text
            };

        }


        showResponse(data);

    } catch (error) {

        showResponse({

            status: false,

            error: "No se pudo conectar con la API.",

            detail: error.message

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
// ENTER PARA EJECUTAR
// ========================================

parameterInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            sendRequest();

        }

    }
);


endpointInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            parameterInput.focus();

        }

    }
);


// ========================================
// INICIO
// ========================================

console.log(
    "Saitama API Tester iniciado."
);
