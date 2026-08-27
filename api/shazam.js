const axios = require('axios')
const FormData = require('form-data')
const fs = require('fs')

const AUDD_API =
    'https://api.audd.io/'

/*
 * Reconoce una canción mediante:
 *
 * 1. URL de un archivo de audio/video accesible públicamente
 * 2. Archivo local enviado previamente al servidor
 *
 * Para una URL remota usamos el parámetro "url".
 */

async function recognizeByUrl(url) {
    const params = new URLSearchParams()

    params.append(
        'api_token',
        process.env.AUDD_API_TOKEN
    )

    params.append(
        'url',
        url
    )

    params.append(
        'return',
        'spotify,apple_music,musicbrainz'
    )

    const response = await axios.post(
        AUDD_API,
        params.toString(),
        {
            headers: {
                'Content-Type':
                    'application/x-www-form-urlencoded'
            },
            timeout: 60000
        }
    )

    return response.data
}


async function recognizeFile(filePath) {
    const form = new FormData()

    form.append(
        'api_token',
        process.env.AUDD_API_TOKEN
    )

    form.append(
        'file',
        fs.createReadStream(filePath)
    )

    form.append(
        'return',
        'spotify,apple_music,musicbrainz'
    )

    const response = await axios.post(
        AUDD_API,
        form,
        {
            headers: {
                ...form.getHeaders()
            },
            timeout: 120000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        }
    )

    return response.data
}


function normalizeResult(result) {
    if (!result) {
        return null
    }

    const spotify =
        result.spotify || {}

    const appleMusic =
        result.apple_music || {}

    const musicbrainz =
        result.musicbrainz || {}

    return {
        title:
            result.title ||
            null,

        artist:
            result.artist ||
            null,

        album:
            result.album ||
            null,

        release_date:
            result.release_date ||
            null,

        label:
            result.label ||
            null,

        timecode:
            result.timecode ||
            null,

        isrc:
            result.isrc ||
            null,

        upc:
            result.upc ||
            null,

        song_link:
            result.song_link ||
            null,

        image:
            spotify.album?.images?.[0]?.url ||
            appleMusic.artwork?.url ||
            null,

        spotify: {
            url:
                spotify.external_urls?.spotify ||
                spotify.url ||
                null,

            id:
                spotify.id ||
                null
        },

        apple_music: {
            url:
                appleMusic.url ||
                null
        },

        musicbrainz: {
            url:
                musicbrainz.url ||
                null
        }
    }
}


async function shazam(req, res) {
    const url =
        String(req.query.url || '').trim()

    const file =
        String(req.query.file || '').trim()

    if (!process.env.AUDD_API_TOKEN) {
        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Missing API Token',
            message:
                'No está configurado AUDD_API_TOKEN en .env'
        })
    }

    if (!url && !file) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Missing Input',
            message:
                'Debes proporcionar una URL de audio/video o un archivo'
        })
    }

    if (url) {
        if (!/^https?:\/\//i.test(url)) {
            return res.status(400).json({
                status: false,
                code: 400,
                creator: 'SaiDev145',
                error: 'Invalid URL',
                message:
                    'La URL debe comenzar con http:// o https://'
            })
        }
    }

    try {
        let apiResponse

        if (url) {
            apiResponse =
                await recognizeByUrl(url)
        } else {
            if (!fs.existsSync(file)) {
                return res.status(404).json({
                    status: false,
                    code: 404,
                    creator: 'SaiDev145',
                    error: 'File Not Found',
                    message:
                        'El archivo indicado no existe'
                })
            }

            apiResponse =
                await recognizeFile(file)
        }

        if (
            apiResponse?.status !== 'success'
        ) {
            return res.status(502).json({
                status: false,
                code: 502,
                creator: 'SaiDev145',
                error: 'Recognition Error',
                message:
                    'AudD no pudo procesar el archivo',
                detail:
                    apiResponse?.error?.error_message ||
                    apiResponse?.error ||
                    'Error desconocido'
            })
        }

        if (!apiResponse.result) {
            return res.status(404).json({
                status: false,
                code: 404,
                creator: 'SaiDev145',
                error: 'Song Not Found',
                message:
                    'No se pudo identificar ninguna canción'
            })
        }

        const song =
            normalizeResult(
                apiResponse.result
            )

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: 'music_recognition',
            source: 'AudD',
            data: song
        })

    } catch (error) {
        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Shazam Error',
            message:
                'No se pudo identificar la canción',
            detail:
                error.response?.data?.error?.error_message ||
                error.response?.data?.message ||
                error.message ||
                'Error desconocido'
        })
    }
}


module.exports = shazam
