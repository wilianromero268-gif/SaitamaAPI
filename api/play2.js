const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')

const YTDLP = 'yt-dlp'
const TMP_DIR = path.join(__dirname, '..', 'tmp', 'play2')

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true })
}

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        execFile(
            YTDLP,
            args,
            {
                maxBuffer: 100 * 1024 * 1024,
                timeout: 180000
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

function safeName(name) {
    return String(name || 'video')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100)
}

function getId(url) {
    try {
        const parsed = new URL(url)

        if (parsed.hostname.includes('youtu.be')) {
            return parsed.pathname.replace('/', '')
        }

        return parsed.searchParams.get('v')
    } catch {
        return null
    }
}

async function searchYouTube(query) {
    const output = await runYtDlp([
        `ytsearch1:${query}`,
        '--dump-single-json',
        '--skip-download',
        '--no-warnings',
        '--no-playlist'
    ])

    return JSON.parse(output)
}

async function downloadVideo(url, id) {
    const output = path.join(TMP_DIR, `${id}.mp4`)

    if (fs.existsSync(output)) {
        return output
    }

    await runYtDlp([
        '--no-warnings',
        '--no-playlist',
        '--no-part',
        '--merge-output-format',
        'mp4',
        '-f',
        'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b',
        '-o',
        output,
        url
    ])

    if (!fs.existsSync(output)) {
        throw new Error('No se pudo crear el archivo MP4')
    }

    return output
}

async function play2(req, res) {
    const query = req.query.q || req.query.query || req.query.search

    if (!query) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Bad Request',
            message: 'El parámetro q es obligatorio'
        })
    }

    try {
        const info = await searchYouTube(query)

        if (!info || !info.id) {
            return res.status(404).json({
                status: false,
                code: 404,
                creator: 'SaiDev145',
                error: 'Not Found',
                message: 'No se encontró ningún video'
            })
        }

        const id = info.id
        const youtubeUrl =
            info.webpage_url ||
            `https://www.youtube.com/watch?v=${id}`

        const filePath = await downloadVideo(
            youtubeUrl,
            id
        )

        const baseUrl =
            `${req.protocol}://${req.get('host')}`

        const downloadUrl =
            `${baseUrl}/saitama/api/play2/file/${id}.mp4`

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: 'video',

            id,

            title:
                info.title ||
                null,

            description:
                info.description ||
                null,

            video: downloadUrl,

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

            url: youtubeUrl,

            format: 'mp4'
        })

    } catch (error) {
        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'YouTube Download Error',
            message: 'No se pudo descargar el video',
            detail: error.message
        })
    }
}

function play2File(req, res) {
    const id = req.params.id

    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Invalid ID',
            message: 'ID de video inválido'
        })
    }

    const filePath =
        path.join(TMP_DIR, `${id}.mp4`)

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            status: false,
            code: 404,
            error: 'File Not Found',
            message: 'El video ya no está disponible'
        })
    }

    res.setHeader(
        'Content-Type',
        'video/mp4'
    )

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${id}.mp4"`
    )

    res.sendFile(filePath)
}

play2.play2File = play2File

module.exports = play2


