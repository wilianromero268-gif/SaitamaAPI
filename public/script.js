// ======================================================
// SAITAMA API - DASHBOARD
// ======================================================

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
    }
};

// ======================================================
// ELEMENTOS
// ======================================================

const apiGrid =
    document.getElementById('apiGrid');

const endpointSelect =
    document.getElementById('endpointSelect');

const parameterInput =
    document.getElementById('parameterInput');

const apiKeyInput =
    document.getElementById('apiKeyInput');

const responseBox =
    document.getElementById('responseBox');

const urlPreview =
    document.getElementById('urlPreview');

const resultMedia =
    document.getElementById('resultMedia');

const resultImage =
    document.getElementById('resultImage');


// ======================================================
// API KEY
// ======================================================

const savedKey =
    localStorage.getItem('saitama_api_key');

if (savedKey) {

    apiKeyInput.value =
        savedKey;

}


apiKeyInput.addEventListener(
    'input',
    () => {

        localStorage.setItem(
            'saitama_api_key',
            apiKeyInput.value.trim()
        );

        updateUrlPreview();

    }
);


// ======================================================
// TOAST
// ======================================================

function toast(message) {

    const element =
        document.getElementById('toast');

    element.textContent =
        message;

    element.classList.add('show');

    setTimeout(() => {

        element.classList.remove('show');

    }, 2200);

}


// ======================================================
// COPIAR API KEY
// ======================================================

document
    .getElementById('copyKeyButton')
    .addEventListener(
        'click',
        async () => {

            const key =
                apiKeyInput.value.trim();

            if (!key) {

                toast('Primero introduce tu API key');

                return;
            }

            try {

                await navigator.clipboard.writeText(key);

                toast('API key copiada');

            } catch {

                apiKeyInput.select();

                document.execCommand('copy');

                toast('API key copiada');

            }

        }
    );


// ======================================================
// CREAR TARJETAS
// ======================================================

function createApiCards() {

    apiGrid.innerHTML = '';

    endpointSelect.innerHTML = `
        <option value="">
            Selecciona un endpoint
        </option>
    `;


    for (const [key, api] of Object.entries(API_CONFIG)) {

        const card =
            document.createElement('div');

        card.className =
            'api-card';


        card.innerHTML = `

            <div class="api-top">

                <div class="api-icon">
                    ${api.icon}
                </div>

                <div class="api-method">
                    GET
                </div>

                <div class="api-online">
                    ● ONLINE
                </div>

            </div>


            <h3>
                ${api.name}
            </h3>


            <p>
                ${getDescription(key)}
            </p>


            <div class="endpoint-row">

                <div class="endpoint">

                    <code>
                        ${api.endpoint}
                    </code>

                </div>


                <button
                    class="test-api-btn"
                    data-api="${key}"
                >
                    Probar
                </button>

            </div>

        `;


        apiGrid.appendChild(card);


        const option =
            document.createElement('option');

        option.value =
            key;

        option.textContent =
            api.name;

        endpointSelect.appendChild(
            option
        );

    }


    document
        .querySelectorAll('.test-api-btn')
        .forEach(button => {

            button.addEventListener(
                'click',
                () => {

                    selectApi(
                        button.dataset.api
                    );

                }
            );

        });


    document
        .getElementById('endpointCount')
        .textContent =
        Object.keys(API_CONFIG).length;

}


// ======================================================
// DESCRIPCIONES
// ======================================================

function getDescription(name) {

    const descriptions = {

        ytmp3:
            'Descarga audio MP3 desde un enlace de YouTube.',

        ytmp4:
            'Descarga videos MP4 desde YouTube.',

        play:
            'Busca una canción y prepara el audio MP3.',

        play2:
            'Busca un video y prepara el archivo MP4.',

        ytsearch:
            'Realiza búsquedas en YouTube.',

        tiktokdl:
            'Descarga contenido disponible de TikTok.',

        tiktoksearch:
            'Busca contenido en TikTok.',

        facebookdl:
            'Procesa enlaces públicos de Facebook.',

        instagramdl:
            'Procesa contenido disponible de Instagram.',

        spotifysearch:
            'Busca canciones y resultados relacionados con Spotify.'

    };

    return descriptions[name] ||
        'Endpoint de Saitama API.';

}


// ======================================================
// SELECCIONAR API
// ======================================================

function selectApi(name) {

    const api =
        API_CONFIG[name];

    if (!api) return;


    endpointSelect.value =
        name;


    parameterInput.value =
        '';

    parameterInput.placeholder =
        api.placeholder;


    parameterInput.dataset.parameter =
        api.parameter;


    updateUrlPreview();


    document
        .getElementById('tester')
        .scrollIntoView({
            behavior: 'smooth'
        });


    setTimeout(() => {

        parameterInput.focus();

    }, 500);

}


// ======================================================
// CAMBIO DE ENDPOINT
// ======================================================

endpointSelect.addEventListener(
    'change',
    () => {

        const name =
            endpointSelect.value;

        if (!name) {

            parameterInput.value = '';

            parameterInput.placeholder =
                'Selecciona un endpoint...';

            delete parameterInput.dataset.parameter;

            updateUrlPreview();

            return;
        }


        selectApi(name);

    }
);


// ======================================================
// CONSTRUIR URL
// ======================================================

function buildUrl() {

    const name =
        endpointSelect.value;

    const api =
        API_CONFIG[name];

    if (!api) return '';


    const value =
        parameterInput.value.trim();


    const params =
        new URLSearchParams();


    if (value) {

        params.set(
            api.parameter,
            value
        );

    }


    const key =
        apiKeyInput.value.trim();


    if (key) {

        params.set(
            'apikey',
            key
        );

    }


    return (
        api.endpoint +
        (
            params.toString()
                ? '?' + params.toString()
                : ''
        )
    );

}


// ======================================================
// ACTUALIZAR URL
// ======================================================

function updateUrlPreview() {

    const url =
        buildUrl();

    urlPreview.textContent =
        url ||
        'Selecciona un endpoint...';

}


parameterInput.addEventListener(
    'input',
    updateUrlPreview
);


// ======================================================
// EJECUTAR API
// ======================================================

document
    .getElementById('sendButton')
    .addEventListener(
        'click',
        sendRequest
    );


async function sendRequest() {

    const name =
        endpointSelect.value;

    if (!name) {

        showError(
            'Selecciona un endpoint.'
        );

        return;
    }


    const api =
        API_CONFIG[name];


    const value =
        parameterInput.value.trim();


    if (!value) {

        showError(
            `Introduce el parámetro: ${api.parameter}`
        );

        parameterInput.focus();

        return;
    }


    const key =
        apiKeyInput.value.trim();


    if (!key) {

        showError(
            'Introduce tu API key.'
        );

        apiKeyInput.focus();

        return;
    }


    const url =
        buildUrl();


    responseBox.textContent =
        'Ejecutando petición...';


    resultMedia.style.display =
        'none';


    try {

        const start =
            Date.now();


        const response =
            await fetch(url);


        const elapsed =
            Date.now() - start;


        const contentType =
            response.headers.get(
                'content-type'
            ) || '';


        let data;


        if (
            contentType.includes(
                'application/json'
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


        showResponse(
            data,
            elapsed,
            response.status
        );


        loadStats();

    } catch (error) {

        showError(
            'No se pudo conectar con la API.',
            error.message
        );

    }

}


// ======================================================
// MOSTRAR RESPUESTA
// ======================================================

function showResponse(
    data,
    elapsed = null,
    statusCode = null
) {

    let output =
        data;


    if (
        typeof data === 'object'
    ) {

        output =
            JSON.stringify(
                data,
                null,
                2
            );

    }


    let prefix = '';


    if (statusCode !== null) {

        prefix +=
            `HTTP ${statusCode}`;

    }


    if (elapsed !== null) {

        prefix +=
            prefix
                ? `  •  ${elapsed} ms`
                : `${elapsed} ms`;

    }


    responseBox.textContent =
        prefix
            ? prefix + '\n\n' + output
            : output;


    showImageFromResponse(data);

}


// ======================================================
// IMAGEN DEL RESULTADO
// ======================================================

function showImageFromResponse(data) {

    resultMedia.style.display =
        'none';


    if (
        !data ||
        typeof data !== 'object'
    ) {

        return;

    }


    const imageUrl =
        findImage(data);


    if (!imageUrl) {

        return;

    }


    resultImage.src =
        imageUrl;


    resultImage.onload =
        () => {

            resultMedia.style.display =
                'block';

        };


    resultImage.onerror =
        () => {

            resultMedia.style.display =
                'none';

        };

}


// ======================================================
// BUSCAR THUMBNAIL / IMAGEN
// ======================================================

function findImage(data) {

    const possibleKeys = [

        'thumbnail',
        'thumb',
        'image',
        'image_url',
        'cover',
        'cover_url',
        'poster',
        'miniatura'

    ];


    for (const key of possibleKeys) {

        if (
            typeof data[key] ===
            'string' &&
            data[key].startsWith('http')
        ) {

            return data[key];

        }

    }


    if (data.data) {

        if (
            typeof data.data ===
            'object'
        ) {

            return findImage(
                data.data
            );

        }

    }


    return null;

}


// ======================================================
// ERROR
// ======================================================

function showError(
    message,
    detail = ''
) {

    responseBox.textContent =
        JSON.stringify(
            {
                status: false,
                error: message,
                ...(detail
                    ? { detail }
                    : {})
            },
            null,
            2
        );

}


// ======================================================
// LIMPIAR
// ======================================================

document
    .getElementById('clearButton')
    .addEventListener(
        'click',
        () => {

            endpointSelect.value =
                '';

            parameterInput.value =
                '';

            parameterInput.placeholder =
                'Selecciona un endpoint...';

            responseBox.textContent =
                'Esperando una petición...';

            urlPreview.textContent =
                'Selecciona un endpoint...';

            resultMedia.style.display =
                'none';

        }
    );


// ======================================================
// STATS
// ======================================================

async function loadStats() {

    try {

        const response =
            await fetch(
                '/saitama/api/stats'
            );


        if (!response.ok) {

            throw new Error(
                'Stats HTTP ' +
                response.status
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !data.data
        ) {

            throw new Error(
                'Formato de stats inválido'
            );

        }


        const stats =
            data.data;


        document
            .getElementById('totalRequests')
            .textContent =
            formatNumber(
                stats.total
            );


        document
            .getElementById('todayRequests')
            .textContent =
            formatNumber(
                stats.today
            );


        const count =
            Object.keys(
                stats.apis || {}
            ).length;


        document
            .getElementById('endpointCount')
            .textContent =
            count;


        document
            .getElementById('apiStatus')
            .textContent =
            '● ONLINE';


        document
            .getElementById('lastUpdate')
            .textContent =
            'Actualizado ahora';

    } catch (error) {

        document
            .getElementById('apiStatus')
            .textContent =
            '● ERROR';


        document
            .getElementById('apiStatus')
            .style.color =
            '#ff5572';


        document
            .getElementById('lastUpdate')
            .textContent =
            'No se pudo cargar stats';

    }

}


// ======================================================
// FORMATO NÚMEROS
// ======================================================

function formatNumber(number) {

    return Number(
        number || 0
    ).toLocaleString(
        'es-PE'
    );

}


// ======================================================
// MÚSICA
// ======================================================

const MUSIC_URL =
    'https://youtu.be/Kqmzbpa7_6w';


const musicButton =
    document.getElementById(
        'musicButton'
    );


musicButton.addEventListener(
    'click',
    () => {

        /*
         * Los navegadores modernos bloquean
         * el autoplay de audio externo.
         *
         * Por eso abrimos la canción al
         * pulsar el botón.
         */

        window.open(
            MUSIC_URL,
            '_blank',
            'noopener,noreferrer'
        );


        musicButton.textContent =
            '🎵 Música abierta';

    }
);


// ======================================================
// ENTER
// ======================================================

parameterInput.addEventListener(
    'keydown',
    event => {

        if (
            event.key === 'Enter'
        ) {

            sendRequest();

        }

    }
);


// ======================================================
// INICIALIZAR
// ======================================================

createApiCards();

loadStats();

setInterval(
    loadStats,
    15000
);

console.log(
    'Saitama API Dashboard iniciado.'
);
