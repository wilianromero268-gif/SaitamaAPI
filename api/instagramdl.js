const axios = require('axios')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { spawn } = require('child_process')
const os = require('os')

const EXPIRE_TIME = 30 * 60 * 1000
const DOWNLOAD_DIR = path.join(
    os.tmpdir(),
    'saitama-api',
    'instagramdl'
)

fs.mkdirSync(DOWNLOAD_DIR, {
    recursive: true
})

const files = new Map()

function generateId() {
    return crypto.randomBytes(8).toString('hex')
}

function safeFileName(name) {
    return String(name || 'instagram')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100)
}

function formatDuration(seconds) {
    if (
        seconds === null ||
        seconds === undefined ||
        isNaN(Number(seconds))
    ) {
        return null
    }

    seconds = Math.floor(Number(seconds))

    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60

    return `${minutes}min ${String(secs).padStart(2, '0')}seg`
}

function isInstagramUrl(url) {
    try {
        const parsed = new URL(url)

        return (
            parsed.protocol === 'https:' &&
            (
                parsed.hostname === 'instagram.com' ||
                parsed.hostname === 'www.instagram.com'
            )
        )
    } catch {
        return false
    }
}

function runYtDlp(args) {
    return new Promise((resolve, reject) => {
        const process = spawn(YTDLP_PATH, args)

        let stdout = ''
        let stderr = ''

        process.stdout.on('data', data => {
            stdout += data.toString()
        })

        process.stderr.on('data', data => {
            stderr += data.toString()
        })

        process.on('error', error => {
            reject(error)
        })

        process.on('close', code => {
            if (code !== 0) {
                return reject(
                    new Error(
                        stderr.trim() ||
                        `yt-dlp terminó con código ${code}`
                    )
                )
            }

            resolve({
                stdout: stdout.trim(),
                stderr: stderr.trim()
            })
        })
    })
}

async function getInstagramInfo(url) {
    const result = await runYtDlp([
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist',
        '--skip-download',
        url
    ])

    if (!result.stdout) {
        throw new Error('yt-dlp no devolvió información')
    }

    return JSON.parse(result.stdout)
}

async function downloadInstagram(url, outputTemplate) {
    await runYtDlp([
        '--no-warnings',
        '--no-playlist',
        '--restrict-filenames',
        '-o',
        outputTemplate,
        url
    ])
}

function findDownloadedFile(id) {
    const extensions = [
        '.mp4',
        '.webm',
        '.mkv',
        '.mov',
        '.jpg',
        '.jpeg',
        '.png',
        '.webp'
    ]

    for (const ext of extensions) {
        const filePath = path.join(TMP_DIR, `${id}${ext}`)

        if (fs.existsSync(filePath)) {
            return filePath
        }
    }

    return null
}

function getMediaType(filePath) {
    const ext = path.extname(filePath).toLowerCase()

    if (
        ext === '.jpg' ||
        ext === '.jpeg' ||
        ext === '.png' ||
        ext === '.webp'
    ) {
        return 'image'
    }

    return 'video'
}

function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase()

    const types = {
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mkv': 'video/x-matroska',
        '.mov': 'video/quicktime',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp'
    }

    return types[ext] || 'application/octet-stream'
}

function scheduleDelete(id, filePath) {
    setTimeout(() => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        } catch {}

        files.delete(id)
    }, EXPIRE_TIME)
}

async function instagramdl(req, res) {
    const instagramUrl = req.query.url

    if (!instagramUrl) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Missing URL',
            message: 'Debes proporcionar una URL de Instagram'
        })
    }

    if (!isInstagramUrl(instagramUrl)) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Invalid URL',
            message: 'La URL debe ser un enlace válido de Instagram'
        })
    }

    try {
        const info = await getInstagramInfo(instagramUrl)

        const title =
            info.title ||
            info.fulltitle ||
            info.description ||
            'Instagram'

        const author =
            info.uploader ||
            info.uploader_id ||
            info.channel ||
            'Instagram'

        const duration =
            info.duration ||
            null

        const thumbnail =
            info.thumbnail ||
            null

        const id = generateId()

        /*
         * Primero intentamos descargar el contenido directamente.
         *
         * Para Instagram, yt-dlp normalmente obtiene:
         * - MP4 para reels/videos
         * - JPG/PNG/WebP para publicaciones de imagen
         */
        const outputTemplate =
            path.join(TMP_DIR, `${id}.%(ext)s`)

        await downloadInstagram(
            instagramUrl,
            outputTemplate
        )

        const filePath = findDownloadedFile(id)

        if (!filePath) {
            throw new Error(
                'yt-dlp terminó pero no se encontró el archivo descargado'
            )
        }

        const mediaType = getMediaType(filePath)

        const extension =
            path.extname(filePath).toLowerCase()

        const filename =
            `${safeFileName(title)}.${extension.replace('.', '')}`

        const baseUrl =
            `${req.protocol}://${req.get('host')}`

        const downloadUrl =
            `${baseUrl}/saitama/api/instagramdl/file/${id}${extension}`

        files.set(id, {
            filePath,
            fileName: filename,
            type: mediaType,
            createdAt: Date.now()
        })

        scheduleDelete(
            id,
            filePath
        )

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: mediaType,
            source: 'Instagram',

            data: {
                title,
                author,
                thumbnail,

                duration:
                    mediaType === 'video'
                        ? formatDuration(duration)
                        : null,

                filename,

                download: downloadUrl,

                expires_in: '30 minutos'
            }
        })

    } catch (error) {
        let message =
            error.message ||
            'Error desconocido'

        if (
            message.includes('Sign in') ||
            message.includes('login')
        ) {
            message =
                'Instagram requiere autenticación para acceder a este contenido'
        }

        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Instagram Download Error',
            message: 'No se pudo descargar el contenido',
            detail: message
        })
    }
}

function instagramdlFile(req, res) {
    const id = req.params.id

    const file = files.get(id)

    if (!file) {
        return res.status(404).json({
            status: false,
            code: 404,
            creator: 'SaiDev145',
            error: 'File Not Found',
            message: 'El archivo no existe o ya expiró'
        })
    }

    if (!fs.existsSync(file.filePath)) {
        files.delete(id)

        return res.status(404).json({
            status: false,
            code: 404,
            creator: 'SaiDev145',
            error: 'File Not Found',
            message: 'El archivo ya fue eliminado'
        })
    }

    res.setHeader(
        'Content-Type',
        getContentType(file.filePath)
    )

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.fileName}"`
    )

    return res.sendFile(
        path.resolve(file.filePath)
    )
}

module.exports = instagramdl
module.exports.instagramdlFile = instagramdlFile
