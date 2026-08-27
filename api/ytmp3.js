const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')
const YTDLP = 'yt-dlp'

const DOWNLOAD_DIR = path.join(
    os.tmpdir(),
    'saitama-ytmp3'
)

fs.mkdirSync(DOWNLOAD_DIR, {
    recursive: true
})

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        execFile(
            YTDLP,
            args,
            {
                maxBuffer: 100 * 1024 * 1024,
                timeout: 300000
            },
            (error, stdout, stderr) => {
                if (error) {
                    return reject(
                        new Error(
                            stderr?.trim() ||
                            error.message ||
                            'yt-dlp error'
                        )
                    )
                }

                resolve(stdout.trim())
            }
        )
    })
}

async function getInfo(url) {
    const output = await runYtDlp([
        '--dump-single-json',
        '--skip-download',
        '--no-warnings',
        '--no-playlist',
        url
    ])

    return JSON.parse(output)
}

function formatDuration(seconds) {
    if (!seconds) return null

    seconds = Math.floor(Number(seconds))

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }

    return `${minutes}:${String(secs).padStart(2, '0')}`
}

function cleanId(id) {
    return String(id || '')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 100)
}

async function downloadMp3(url, outputFile) {
    await runYtDlp([
        '--no-warnings',
        '--no-playlist',

        // Extraer solamente audio
        '-x',

        // Convertir a MP3
        '--audio-format',
        'mp3',

        // Calidad de audio
        '--audio-quality',
        '192K',

        // Evitar archivos temporales visibles
        '--no-part',

        // Archivo de salida
        '-o',
        outputFile,

        url
    ])
}

async function ytmp3(req, res) {
    const url = req.query.url

    if (!url) {
        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Bad Request',
            message: 'El parámetro url es obligatorio'
        })
    }

    const validUrl =
        url.includes('youtube.com') ||
        url.includes('youtu.be')

    if (!validUrl) {
        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Invalid URL',
            message: 'La URL debe ser de YouTube'
        })
    }

    try {
        // Obtener información
        const info = await getInfo(url)

        const id = cleanId(info.id)

        if (!id) {
            throw new Error(
                'No se pudo obtener el ID del video'
            )
        }

        const outputFile = path.join(
            DOWNLOAD_DIR,
            `${id}.mp3`
        )

        // Descargar solamente si todavía no existe
        if (!fs.existsSync(outputFile)) {
            await downloadMp3(
                url,
                outputFile
            )
        }

        if (!fs.existsSync(outputFile)) {
            throw new Error(
                'yt-dlp no generó el archivo MP3'
            )
        }

        const baseUrl =
            `${req.protocol}://${req.get('host')}`

        const downloadUrl =
            `${baseUrl}/saitama/api/ytmp3/file/${id}.mp3`

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: 'audio',

            id,

            title:
                info.title ||
                null,

            description:
                info.description ||
                null,

            audio: downloadUrl,

            download: downloadUrl,

            thumbnail:
                info.thumbnail ||
                null,

            duration:
                formatDuration(info.duration),

            duration_seconds:
                info.duration ||
                0,

            views:
                info.view_count ||
                0,

            likes:
                info.like_count ||
                0,

            comments:
                info.comment_count ||
                0,

            channel:
                info.channel ||
                info.uploader ||
                null,

            channel_url:
                info.channel_url ||
                info.uploader_url ||
                null,

            url:
                info.webpage_url ||
                url,

            format: 'mp3',
            quality: '192kbps'
        })

    } catch (error) {
        console.error(
            'YTMP3 ERROR:',
            error
        )

        return res.status(500).json({
            status: false,
            code: 500,
            error: 'YouTube Audio Error',
            message:
                'No se pudo descargar el audio de YouTube',
            detail:
                error.message
        })
    }
}


// ============================================
// ENVIAR MP3
// ============================================

async function ytmp3File(req, res) {
    try {
        const id = cleanId(
            req.params.id
        )

        if (!id) {
            return res.status(400).json({
                status: false,
                code: 400,
                error: 'Invalid ID'
            })
        }

        const file = path.join(
            DOWNLOAD_DIR,
            `${id}.mp3`
        )

        if (!fs.existsSync(file)) {
            return res.status(404).json({
                status: false,
                code: 404,
                error: 'File Not Found',
                message:
                    'El audio ya no está disponible'
            })
        }

        res.setHeader(
            'Content-Type',
            'audio/mpeg'
        )

        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${id}.mp3"`
        )

        res.setHeader(
            'Cache-Control',
            'public, max-age=1800'
        )

        return res.sendFile(file)

    } catch (error) {
        return res.status(500).json({
            status: false,
            code: 500,
            error: 'File Error',
            message:
                'No se pudo enviar el audio'
        })
    }
}

module.exports = ytmp3
module.exports.ytmp3File = ytmp3File
