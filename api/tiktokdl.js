const { execFile } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const exec = promisify(execFile)

const DIR = path.join(__dirname, '..', 'tmp', 'tiktok')
const LIFE = 30 * 60 * 1000

if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR, { recursive: true })
}

function clean() {
    if (!fs.existsSync(DIR)) return

    const now = Date.now()

    for (const file of fs.readdirSync(DIR)) {
        const filePath = path.join(DIR, file)

        try {
            if (now - fs.statSync(filePath).mtimeMs > LIFE) {
                fs.unlinkSync(filePath)
            }
        } catch {}
    }
}

async function getInfo(url) {
    const { stdout } = await exec(
        'yt-dlp',
        [
            '--dump-single-json',
            '--skip-download',
            '--no-warnings',
            '--no-playlist',
            url
        ],
        {
            timeout: 120000,
            maxBuffer: 50 * 1024 * 1024
        }
    )

    return JSON.parse(stdout)
}

async function downloadVideo(url, output) {
    await exec(
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
            timeout: 300000,
            maxBuffer: 50 * 1024 * 1024
        }
    )
}

async function tiktokdl(req, res) {

    clean()

    const url = String(req.query.url || '').trim()

    if (!url) {
        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Bad Request',
            message: 'El parámetro url es obligatorio'
        })
    }

    if (!/tiktok\.com/i.test(url)) {
        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Invalid URL',
            message: 'La URL no es de TikTok'
        })
    }

    try {

        const info = await getInfo(url)

        /*
         * Solo vídeos
         */

        const webpage =
            info.webpage_url ||
            info.original_url ||
            url

        if (
            webpage.includes('/photo/')
        ) {
            return res.status(422).json({
                status: false,
                code: 422,
                creator: 'SaiDev145',
                type: 'image',
                error: 'Not a video',
                message:
                    'Este enlace corresponde a una publicación de fotos de TikTok'
            })
        }

        const id =
            info.id ||
            Date.now().toString()

        const filename = `${id}.mp4`

        const output =
            path.join(DIR, filename)

        /*
         * Descargar solamente si no existe
         */

        if (!fs.existsSync(output)) {
            await downloadVideo(url, output)
        }

        if (!fs.existsSync(output)) {
            throw new Error(
                'No se pudo generar el archivo MP4'
            )
        }

        const host =
            `${req.protocol}://${req.get('host')}`

        const video =
            `${host}/saitama/api/tiktokdl/file/${filename}`

        return res.json({

            status: true,
            code: 200,
            creator: 'SaiDev145',

            type: 'video',

            video,

            thumbnail:
                info.thumbnail ||
                null,

            id,

            title:
                info.title ||
                info.description ||
                null,

            description:
                info.description ||
                null,

            username:
                info.uploader ||
                info.uploader_id ||
                null,

            author: {
                username:
                    info.uploader ||
                    info.uploader_id ||
                    null,

                name:
                    info.channel ||
                    info.uploader ||
                    null,

                id:
                    info.uploader_id ||
                    null
            },

            duration:
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

            url,

            resolved_url:
                webpage,

            source:
                webpage,

            expires_in:
                '30 minutes'
        })

    } catch (error) {

        return res.status(500).json({
            status: false,
            code: 500,
            error: 'TikTok Extraction Error',
            message:
                'No se pudo descargar el video de TikTok',
            detail:
                error.stderr ||
                error.message
        })
    }
}


/*
 * SERVIR MP4
 * No necesita API key
 */

function serveTikTokFile(req, res) {

    clean()

    const filename =
        path.basename(req.params.filename)

    if (
        !filename.endsWith('.mp4') ||
        filename.includes('..')
    ) {
        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Archivo inválido'
        })
    }

    const file =
        path.join(DIR, filename)

    if (!fs.existsSync(file)) {
        return res.status(404).json({
            status: false,
            code: 404,
            error: 'Video no encontrado',
            message: 'El archivo expiró o no existe'
        })
    }

    if (
        Date.now() - fs.statSync(file).mtimeMs > LIFE
    ) {

        try {
            fs.unlinkSync(file)
        } catch {}

        return res.status(404).json({
            status: false,
            code: 404,
            error: 'Video expirado'
        })
    }

    res.setHeader('Content-Type', 'video/mp4')

    res.setHeader(
        'Content-Disposition',
        `inline; filename="${filename}"`
    )

    return res.sendFile(file)
}

module.exports = tiktokdl

module.exports.serveTikTokFile =
    serveTikTokFile
