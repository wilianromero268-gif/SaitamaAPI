const APIs = [

    {
        name: "YouTube MP4",
        description: "Descarga videos de YouTube en formato MP4.",
        method: "GET",
        endpoint: "/saitama/api/ytmp4",
        params: [
            {
                name: "url",
                description: "URL del video de YouTube",
                required: true
            }
        ]
    },

    {
        name: "YouTube MP3",
        description: "Descarga el audio de un video de YouTube.",
        method: "GET",
        endpoint: "/saitama/api/ytmp3",
        params: [
            {
                name: "url",
                description: "URL del video de YouTube",
                required: true
            }
        ]
    },

    {
        name: "Play",
        description: "Busca una canción y devuelve el resultado en MP3.",
        method: "GET",
        endpoint: "/saitama/api/play",
        params: [
            {
                name: "q",
                description: "Nombre de la canción",
                required: true
            }
        ]
    },

    {
        name: "Play2",
        description: "Busca un video y devuelve el resultado en video.",
        method: "GET",
        endpoint: "/saitama/api/play2",
        params: [
            {
                name: "q",
                description: "Nombre del video",
                required: true
            }
        ]
    },

    {
        name: "TikTok Downloader",
        description: "Descarga videos o imágenes de TikTok.",
        method: "GET",
        endpoint: "/saitama/api/tiktokdl",
        params: [
            {
                name: "url",
                description: "URL de TikTok",
                required: true
            }
        ]
    },

    {
        name: "Facebook Downloader",
        description: "Obtiene contenido descargable desde Facebook.",
        method: "GET",
        endpoint: "/saitama/api/facebookdl",
        params: [
            {
                name: "url",
                description: "URL de Facebook",
                required: true
            }
        ]
    },

    {
        name: "Instagram Downloader",
        description: "Descarga fotos y videos de Instagram.",
        method: "GET",
        endpoint: "/saitama/api/instagramdl",
        params: [
            {
                name: "url",
                description: "URL de Instagram",
                required: true
            }
        ]
    },

    {
        name: "YouTube Search",
        description: "Busca hasta 10 resultados de YouTube.",
        method: "GET",
        endpoint: "/saitama/api/ytsearch",
        params: [
            {
                name: "q",
                description: "Término de búsqueda",
                required: true
            }
        ]
    },

    {
        name: "TikTok Search",
        description: "Busca hasta 10 resultados de TikTok.",
        method: "GET",
        endpoint: "/saitama/api/tiktoksearch",
        params: [
            {
                name: "q",
                description: "Término de búsqueda",
                required: true
            }
        ]
    },

    {
        name: "Spotify Search",
        description: "Busca canciones y devuelve información y URL disponible.",
        method: "GET",
        endpoint: "/saitama/api/spotifysearch",
        params: [
            {
                name: "q",
                description: "Nombre de la canción o artista",
                required: true
            }
        ]
    },

    {
        name: "Spotify MP3",
        description: "Obtiene el audio a partir de una URL compatible.",
        method: "GET",
        endpoint: "/saitama/api/spotifymp3",
        params: [
            {
                name: "url",
                description: "URL de Spotify",
                required: true
            }
        ]
    },

    {
        name: "Pinterest",
        description: "Obtiene contenido público de Pinterest.",
        method: "GET",
        endpoint: "/saitama/api/pinterest",
        params: [
            {
                name: "url",
                description: "URL de Pinterest",
                required: true
            }
        ]
    },

    {
        name: "Saitama AI",
        description: "Inteligencia artificial de Saitama.",
        method: "GET",
        endpoint: "/saitama/api/ai",
        params: [
            {
                name: "q",
                description: "Pregunta para la IA",
                required: true
            }
        ]
    },

    {
        name: "APK Search",
        description: "Busca aplicaciones y muestra información y fuentes legítimas.",
        method: "GET",
        endpoint: "/saitama/api/apk",
        params: [
            {
                name: "q",
                description: "Nombre de la aplicación",
                required: true
            }
        ]
    }

]


const apiList =
    document.getElementById("api-list")

const endpointInput =
    document.getElementById("endpoint")

const methodElement =
    document.getElementById("method")

const parameters =
    document.getElementById("parameters")

const response =
    document.getElementById("response")

const sendButton =
    document.getElementById("send-request")

const apiKeyInput =
    document.getElementById("apikey")


/* =========================
   CREAR TARJETAS
========================= */

function renderAPIs() {

    apiList.innerHTML = ""

    APIs.forEach((api, index) => {

        const card =
            document.createElement("article")

        card.className = "api-card"

        card.innerHTML = `
            <div class="api-top">

                <div>
                    <span class="method-badge">
                        ${api.method}
                    </span>

                    <h3>
                        ${api.name}
                    </h3>
                </div>

                <span class="api-online">
                    ●
                </span>

            </div>

            <code class="api-endpoint">
                ${api.endpoint}
            </code>

            <p>
                ${api.description}
            </p>

            <button
                class="try-button"
                data-index="${index}"
            >
                Probar →
            </button>
        `

        apiList.appendChild(card)

    })


    document
        .querySelectorAll(".try-button")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const index =
                        Number(
                            button.dataset.index
                        )

                    selectAPI(APIs[index])

                }
            )

        })

}


/* =========================
   SELECCIONAR API
========================= */

function selectAPI(api) {

    endpointInput.value =
        api.endpoint

    methodElement.textContent =
        api.method

    parameters.innerHTML = ""


    api.params.forEach(param => {

        const container =
            document.createElement("div")

        container.className =
            "parameter"


        container.innerHTML = `
            <label>
                ${param.name}
                ${param.required ? "*" : ""}
            </label>

            <input
                type="text"
                data-param="${param.name}"
                placeholder="${param.description}"
            >
        `

        parameters.appendChild(container)

    })


    document
        .getElementById("tester")
        .scrollIntoView({
            behavior: "smooth"
        })

}


/* =========================
   ESTADÍSTICAS
========================= */

async function loadStats() {

    try {

        const res =
            await fetch(
                "/saitama/api/stats"
            )

        const data =
            await res.json()


        if (
            data.status &&
            data.data
        ) {

            document
                .getElementById(
                    "total-requests"
                )
                .textContent =
                    data.data.total


            document
                .getElementById(
                    "today-requests"
                )
                .textContent =
                    data.data.today


            document
                .getElementById(
                    "api-status"
                )
                .textContent =
                    "ONLINE"

        }

    } catch {

        document
            .getElementById(
                "api-status"
            )
            .textContent =
                "OFFLINE"

    }

}


/* =========================
   ENVIAR REQUEST
========================= */

sendButton.addEventListener(
    "click",
    async () => {

        let endpoint =
            endpointInput.value.trim()


        if (!endpoint) {

            showResponse(
                false,
                400,
                "Bad Request",
                "Endpoint is empty"
            )

            return

        }


        const apiKey =
            apiKeyInput.value.trim()


        if (!apiKey) {

            showResponse(
                false,
                401,
                "Unauthorized",
                "API key is required"
            )

            return

        }


        const inputs =
            parameters.querySelectorAll(
                "input"
            )


        const query =
            new URLSearchParams()


        inputs.forEach(input => {

            const value =
                input.value.trim()

            const name =
                input.dataset.param


            if (value) {

                query.append(
                    name,
                    value
                )

            }

        })


        query.set(
            "apikey",
            apiKey
        )


        const separator =
            endpoint.includes("?")
                ? "&"
                : "?"


        const finalURL =
            endpoint +
            separator +
            query.toString()


        response.textContent =
            "Enviando solicitud..."


        try {

            const res =
                await fetch(finalURL)


            const text =
                await res.text()


            let data

            try {

                data =
                    JSON.parse(text)

            } catch {

                data = {
                    status: res.ok,
                    code: res.status,
                    response: text
                }

            }


            response.textContent =
                JSON.stringify(
                    data,
                    null,
                    2
                )


            loadStats()

        } catch (error) {

            showResponse(
                false,
                500,
                "Request Error",
                error.message
            )

        }

    }
)


/* =========================
   RESPUESTA
========================= */

function showResponse(
    status,
    code,
    error,
    message
) {

    response.textContent =
        JSON.stringify(
            {
                status,
                code,
                error,
                message
            },
            null,
            2
        )

}


/* =========================
   INICIO
========================= */

renderAPIs()

loadStats()

setInterval(
    loadStats,
    10000
)
