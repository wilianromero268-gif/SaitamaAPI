const { execFile } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const execFileAsync = promisify(execFile)

const DOWNLOAD_DIR = path.join(
    __dirname, '..', 'tmp', 'facebook'
)

const FILE_LIFETIME = 30 * 60 * 1000

fs.mkdirSync(DOWNLOAD_DIR, { recursive: true })

function cleanOldFiles() {
    const now = Date.now()

    for (const file of fs.readdirSync(DOWNLOAD_DIR)) {
        const filePath = path.join(DOWNLOAD_DIR, file)

        try {
            if (now - fs.statSync(filePath).mtimeMs > FILE_LIFETIME)
                fs.unlinkSync(filePath)
        } catch {}
    }
}

async function getInfo(url) {
    const { stdout } = await execFileAsync(
        'yt-dlp',
        [
            '--dump-single-json',
            '--skip-download',
            '--no-warnings',
            '--no-playlist',
            url
        ],
        {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 120000
        }
    )

    return JSON.parse(stdout)
}

async function downloadVideo(url, output) {
    await execFileAsync(
        'yt-dlp',
        [
            '--no-warnings',
            '--no-playlist',
            '-f',
            'bv*[ext=mp4]+ba/b[ext=mp4]/b',
            '--merge-output-format',
            'mp4',
            '-o',
            output,
            url
        ],
        {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 300000
        }
    )
}

async function facebookdl(req, res) {

    cleanOldFiles()

    const url = String(req.query.url || '').trim()

    if (!url) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Bad Request',
            message: 'El parámetro url es obligatorio'
        })
    }

    if (!/facebook\.com|fb\.watch/i.test(url)) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Invalid URL',
            message: 'La URL no parece ser de Facebook'
        })
    }

    try {

        const info = await getInfo(url)

        const id =
            info.id ||
            Date.now().toString()

        const filename = `${id}.mp4`

        const output = path.join(
            DOWNLOAD_DIR,
            filename
        )

        if (!fs.existsSync(output)) {
            await downloadVideo(url, output)
        }

        if (!fs.existsSync(output)) {
            throw new Error(
                'No se generó el archivo MP4'
            )
        }

        const host =
            `${req.protocol}://${req.get('host')}`

        const video =
            `${host}/saitama/api/facebookdl/file/${filename}`

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',

            type: 'video',

            video,

            thumbnail:
                info.thumbnail || null,

            id:
                info.id || null,

            title:
                info.title ||
                info.description ||
                null,

            description:
                info.description || null,

            duration:
                info.duration || 0,

            views:
                info.view_count || 0,

            likes:
                info.like_count || 0,

            comments:
                info.comment_count || 0,

            uploader:
                info.uploader || null,

            url,

            source:
                info.webpage_url || url,

            expires_in:
                '30 minutes'
        })

    } catch (error) {

        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Facebook Download Error',
            message: 'No se pudo descargar el video de Facebook',
            detail: error.message
        })
    }
}

function serveFacebookFile(req, res) {

    cleanOldFiles()

    const filename =
        path.basename(req.params.filename)

    if (!/^[a-zA-Z0-9_-]+\.mp4$/.test(filename)) {
        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Archivo inválido'
        })
    }

    const filePath =
        path.join(DOWNLOAD_DIR, filename)

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            status: false,
            code: 404,
            error: 'Video no encontrado',
            message: 'El archivo expiró o fue eliminado'
        })
    }

    res.setHeader(
        'Content-Type',
        'video/mp4'
    )

    res.setHeader(
        'Content-Disposition',
        `inline; filename="${filename}"`
    )

    return res.sendFile(filePath)
}

module.exports = facebookdl

module.exports.serveFacebookFile =
    serveFacebookFile
