const axios = require('axios')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')

const TMP_DIR = path.join(
    process.cwd(),
    'tmp',
    'spotifydl'
)

const EXPIRE_TIME = 30 * 60 * 1000

const DELIRIUS_DOWNLOAD =
    'https://api.delirius.online/download/spotifydl'

const DELIRIUS_SEARCH =
    'https://api.delirius.online/search/spotifysearchweb'

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, {
        recursive: true
    })
}

const files = new Map()

// ========================================
// GENERAR ID
// ========================================

function generateId() {
    return crypto
        .randomBytes(8)
        .toString('hex')
}

// ========================================
// NOMBRE SEGURO
// ========================================

function safeFileName(name) {
    return String(name || 'spotify')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100)
}

// ========================================
// FORMATEAR DURACIÓN
// ========================================

function formatDuration(seconds) {
    if (
        seconds === null ||
        seconds === undefined ||
        seconds === '' ||
        isNaN(Number(seconds))
    ) {
        return null
    }

    seconds = Math.floor(Number(seconds))

    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60

    return `${minutes}min ${String(secs).padStart(2, '0')}seg`
}

// ========================================
// CONVERTIR 3:13 -> SEGUNDOS
// ========================================

function parseDuration(value) {
    if (
        value === null ||
        value === undefined ||
        value === ''
    ) {
        return null
    }

    // Número
    if (!isNaN(Number(value))) {
        return Number(value)
    }

    const text = String(value).trim()

    // 3:13
    const match = text.match(
        /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/
    )

    if (!match) {
        return null
    }

    if (match[3] !== undefined) {
        const hours = Number(match[1])
        const minutes = Number(match[2])
        const seconds = Number(match[3])

        return (
            hours * 3600 +
            minutes * 60 +
            seconds
        )
    }

    const minutes = Number(match[1])
    const seconds = Number(match[2])

    return (
        minutes * 60 +
        seconds
    )
}

// ========================================
// SPOTIFY ID
// ========================================

function extractSpotifyId(url) {
    try {
        const parsed = new URL(url)

        const match =
            parsed.pathname.match(
                /\/track\/([a-zA-Z0-9]+)/
            )

        return match
            ? match[1]
            : null

    } catch {
        return null
    }
}

// ========================================
// BUSCAR INFORMACIÓN EXTRA
// ========================================

async function getSpotifyInfo(
    spotifyUrl,
    title,
    artist
) {
    try {
        const spotifyId =
            extractSpotifyId(spotifyUrl)

        const query =
            `${title || ''} ${artist || ''}`.trim()

        if (!query) {
            return {}
        }

        const response =
            await axios.get(
                DELIRIUS_SEARCH,
                {
                    params: {
                        q: query,
                        limit: 10
                    },
                    timeout: 15000
                }
            )

        const results =
            response.data?.data || []

        let match = null

        // Buscar por ID
        if (spotifyId) {
            match = results.find(
                item =>
                    String(item.id) ===
                    String(spotifyId)
            )
        }

        // Buscar por título + artista
        if (!match) {
            match = results.find(item => {
                const itemTitle =
                    String(
                        item.title || ''
                    )
                        .toLowerCase()
                        .trim()

                const itemArtist =
                    String(
                        item.artist || ''
                    )
                        .toLowerCase()
                        .trim()

                const wantedTitle =
                    String(
                        title || ''
                    )
                        .toLowerCase()
                        .trim()

                const wantedArtist =
                    String(
                        artist || ''
                    )
                        .toLowerCase()
                        .trim()

                return (
                    itemTitle === wantedTitle &&
                    itemArtist.includes(
                        wantedArtist
                    )
                )
            })
        }

        if (!match) {
            return {}
        }

        return {
            duration:
                match.duration ||
                match.duration_timestamp ||
                null,

            published:
                match.published ||
                match.release_date ||
                match.releaseDate ||
                match.date ||
                null
        }

    } catch {
        return {}
    }
}

// ========================================
// DESCARGAR ARCHIVO
// ========================================

async function downloadToFile(
    url,
    filePath
) {
    const response =
        await axios.get(
            url,
            {
                responseType: 'stream',
                timeout: 120000,
                maxRedirects: 10,
                validateStatus: status =>
                    status >= 200 &&
                    status < 300
            }
        )

    const writer =
        fs.createWriteStream(filePath)

    return new Promise(
        (resolve, reject) => {
            response.data.pipe(writer)

            writer.on(
                'finish',
                resolve
            )

            writer.on(
                'error',
                reject
            )

            response.data.on(
                'error',
                reject
            )
        }
    )
}

// ========================================
// LEER METADATOS DEL MP3
// ========================================

function probeAudio(filePath) {
    return new Promise(resolve => {
        const ffprobe =
            spawn(
                'ffprobe',
                [
                    '-v',
                    'quiet',
                    '-print_format',
                    'json',
                    '-show_format',
                    '-show_streams',
                    filePath
                ]
            )

        let stdout = ''

        ffprobe.stdout.on(
            'data',
            chunk => {
                stdout +=
                    chunk.toString()
            }
        )

        ffprobe.on(
            'error',
            () => {
                resolve({})
            }
        )

        ffprobe.on(
            'close',
            () => {
                try {
                    const data =
                        JSON.parse(stdout)

                    const format =
                        data.format || {}

                    const tags =
                        format.tags || {}

                    let duration =
                        format.duration

                    if (
                        !duration &&
                        Array.isArray(
                            data.streams
                        )
                    ) {
                        const audio =
                            data.streams.find(
                                stream =>
                                    stream.codec_type ===
                                    'audio'
                            )

                        duration =
                            audio?.duration
                    }

                    resolve({
                        duration:
                            duration
                                ? Number(duration)
                                : null,

                        published:
                            tags.date ||
                            tags.DATE ||
                            tags.year ||
                            tags.YEAR ||
                            null,

                        title:
                            tags.title ||
                            tags.TITLE ||
                            null,

                        artist:
                            tags.artist ||
                            tags.ARTIST ||
                            null,

                        album:
                            tags.album ||
                            tags.ALBUM ||
                            null
                    })

                } catch {
                    resolve({})
                }
            }
        )
    })
}

// ========================================
// ELIMINAR DESPUÉS DE 30 MINUTOS
// ========================================

function scheduleDelete(
    id,
    filePath
) {
    setTimeout(() => {
        try {
            if (
                fs.existsSync(filePath)
            ) {
                fs.unlinkSync(filePath)
            }
        } catch {}

        files.delete(id)

    }, EXPIRE_TIME)
}

// ========================================
// SPOTIFYDL
// ========================================

async function spotifydl(
    req,
    res
) {
    const spotifyUrl =
        req.query.url

    // ====================================
    // URL FALTANTE
    // ====================================

    if (!spotifyUrl) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Missing URL',
            message:
                'Debes proporcionar una URL de Spotify'
        })
    }

    // ====================================
    // VALIDAR URL
    // ====================================

    if (
        !/^https?:\/\/(open\.)?spotify\.com\/track\//i.test(
            spotifyUrl
        )
    ) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Invalid URL',
            message:
                'La URL debe ser un enlace válido de una canción de Spotify'
        })
    }

    try {
        // ==================================
        // DELIRIUS
        // ==================================

        const apiResponse =
            await axios.get(
                DELIRIUS_DOWNLOAD,
                {
                    params: {
                        url: spotifyUrl
                    },
                    timeout: 60000
                }
            )

        const data =
            apiResponse.data?.data

        if (
            !apiResponse.data?.status ||
            !data?.download
        ) {
            throw new Error(
                'La API de Delirius no devolvió un enlace de descarga'
            )
        }

        // ==================================
        // INFORMACIÓN
        // ==================================

        const title =
            data.title ||
            'Spotify Audio'

        const artist =
            data.author ||
            'Unknown Artist'

        const image =
            data.image ||
            null

        // ==================================
        // ID
        // ==================================

        const id =
            generateId()

        // ==================================
        // NOMBRE
        // ==================================

        const fileName =
            `${safeFileName(title)} - ${safeFileName(artist)}.mp3`

        // ==================================
        // RUTA DEL ARCHIVO
        // ==================================

        const filePath =
            path.join(
                TMP_DIR,
                `${id}.mp3`
            )

        // ==================================
        // DESCARGAR MP3
        // ==================================

        await downloadToFile(
            data.download,
            filePath
        )

        // ==================================
        // COMPROBAR
        // ==================================

        if (
            !fs.existsSync(filePath)
        ) {
            throw new Error(
                'El archivo no fue creado correctamente'
            )
        }

        const stats =
            fs.statSync(filePath)

        if (
            !stats.size ||
            stats.size < 1000
        ) {
            try {
                fs.unlinkSync(
                    filePath
                )
            } catch {}

            throw new Error(
                'La descarga está vacía o incompleta'
            )
        }

        // ==================================
        // FFPROBE
        // ==================================

        const audioInfo =
            await probeAudio(
                filePath
            )

        // ==================================
        // INFORMACIÓN EXTRA
        // ==================================

        const extraInfo =
            await getSpotifyInfo(
                spotifyUrl,
                title,
                artist
            )

        // ==================================
        // DURACIÓN
        // ==================================

        const durationSeconds =
            audioInfo.duration ||
            parseDuration(
                extraInfo.duration
            )

        const duration =
            formatDuration(
                durationSeconds
            )

        // ==================================
        // PUBLICACIÓN
        // ==================================

        const published =
            audioInfo.published ||
            extraInfo.published ||
            null

        // ==================================
        // URL COMPLETA
        // ==================================

        const baseUrl =
            `${req.protocol}://${req.get('host')}`

        const downloadUrl =
            `${baseUrl}/saitama/api/spotifydl/file/${id}.mp3`

        // ==================================
        // GUARDAR EN MEMORIA
        // ==================================

        files.set(id, {
            filePath,
            fileName,
            createdAt:
                Date.now()
        })

        // ==================================
        // ELIMINAR EN 30 MINUTOS
        // ==================================

        scheduleDelete(
            id,
            filePath
        )

        // ==================================
        // RESPUESTA
        // ==================================

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: 'audio',
            source: 'Spotify',

            data: {
                title,
                author: artist,
                image,

                duration:
                    duration || null,

                published:
                    published || null,

                filename:
                    fileName,

                download:
                    downloadUrl,

                expires_in:
                    '30 minutos'
            }
        })

    } catch (error) {
        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Audio Download Error',
            message:
                'No se pudo procesar el audio',

            detail:
                error.response?.data?.message ||
                error.message ||
                'Error desconocido'
        })
    }
}

// ========================================
// SERVIR MP3
// ========================================

function spotifydlFile(
    req,
    res
) {
    const id =
        req.params.id

    const file =
        files.get(id)

    // ====================================
    // NO EXISTE
    // ====================================

    if (!file) {
        return res.status(404).json({
            status: false,
            code: 404,
            creator: 'SaiDev145',
            error: 'File Not Found',
            message:
                'El archivo no existe o ya expiró'
        })
    }

    // ====================================
    // ARCHIVO BORRADO
    // ====================================

    if (
        !fs.existsSync(
            file.filePath
        )
    ) {
        files.delete(id)

        return res.status(404).json({
            status: false,
            code: 404,
            creator: 'SaiDev145',
            error: 'File Not Found',
            message:
                'El archivo ya fue eliminado'
        })
    }

    // ====================================
    // HEADERS
    // ====================================

    res.setHeader(
        'Content-Type',
        'audio/mpeg'
    )

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.fileName}"`
    )

    res.setHeader(
        'Cache-Control',
        'no-cache'
    )

    // ====================================
    // ENVIAR MP3
    // ====================================

    return res.sendFile(
        path.resolve(
            file.filePath
        )
    )
}

// ========================================
// EXPORTAR
// ========================================

module.exports = spotifydl

module.exports.spotifydlFile =
    spotifydlFile
