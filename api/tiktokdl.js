const { execFile } = require('child_process')
const { promisify } = require('util')
const fs = require('fs')
const path = require('path')

const execFileAsync = promisify(execFile)

const YTDLP = 'yt-dlp'

const DOWNLOAD_DIR = path.join(
    __dirname,
    '..',
    'tmp',
    'tiktok'
)

const FILE_LIFETIME = 30 * 60 * 1000

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, {
        recursive: true
    })
}


// ==========================================
// LIMPIAR ARCHIVOS ANTIGUOS
// ==========================================

function cleanOldFiles() {

    if (!fs.existsSync(DOWNLOAD_DIR)) {
        return
    }

    const now = Date.now()

    for (const file of fs.readdirSync(DOWNLOAD_DIR)) {

        const filePath = path.join(
            DOWNLOAD_DIR,
            file
        )

        try {

            const stat = fs.statSync(filePath)

            if (
                now - stat.mtimeMs >
                FILE_LIFETIME
            ) {

                fs.unlinkSync(filePath)

            }

        } catch {}

    }
}


// ==========================================
// OBTENER INFORMACIÓN
// ==========================================

async function getTikTokInfo(url) {

    const { stdout } = await execFileAsync(
        YTDLP,
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


// ==========================================
// DESCARGAR MP4
// ==========================================

async function downloadTikTok(url, output) {

    await execFileAsync(
        YTDLP,
        [
            '--no-warnings',
            '--no-playlist',

            '-f',
            'bv*[ext=mp4]+ba/b[ext=mp4]/b',

            '--merge-output-format',
            'mp4',

            '--output',
            output,

            url
        ],
        {
            maxBuffer: 50 * 1024 * 1024,
            timeout: 300000
        }
    )

}


// ==========================================
// IMÁGENES
// ==========================================

function getImages(info) {

    return (info.thumbnails || [])
        .map(x => x.url)
        .filter(Boolean)

}


// ==========================================
// HANDLER
// ==========================================

async function tiktokdl(req, res) {

    cleanOldFiles()

    const url = req.query.url

    if (!url) {

        return res.status(400).json({

            status: false,

            code: 400,

            error: 'Bad Request',

            message:
                'El parámetro url es obligatorio'

        })

    }


    if (
        !url.includes('tiktok.com') &&
        !url.includes('vt.tiktok.com')
    ) {

        return res.status(400).json({

            status: false,

            code: 400,

            error: 'Invalid URL',

            message:
                'La URL proporcionada no es de TikTok'

        })

    }


    try {

        // ==================================
        // OBTENER INFORMACIÓN
        // ==================================

        const info =
            await getTikTokInfo(url)


        const id =
            info.id ||
            Date.now().toString()


        const filename =
            `${id}.mp4`


        const output =
            path.join(
                DOWNLOAD_DIR,
                filename
            )


        // ==================================
        // SI YA EXISTE Y TIENE MENOS DE 30 MIN
        // ==================================

        if (fs.existsSync(output)) {

            const stat =
                fs.statSync(output)

            const age =
                Date.now() - stat.mtimeMs

            if (age > FILE_LIFETIME) {

                try {
                    fs.unlinkSync(output)
                } catch {}

            }

        }


        // ==================================
        // DESCARGAR
        // ==================================

        if (!fs.existsSync(output)) {

            await downloadTikTok(
                url,
                output
            )

        }


        // ==================================
        // COMPROBAR ARCHIVO
        // ==================================

        if (!fs.existsSync(output)) {

            throw new Error(
                'El archivo MP4 no fue generado'
            )

        }


        // ==================================
        // URL DEL MP4
        // ==================================

        const host =
            `${req.protocol}://${req.get('host')}`


        const videoUrl =
            `${host}/saitama/api/tiktokdl/file/${encodeURIComponent(filename)}`


        // ==================================
        // RESPUESTA
        // ==================================

        return res.json({

            status: true,

            code: 200,

            creator: 'SaiDev145',

            type: 'video',

            video: videoUrl,

            thumbnail:
                info.thumbnail ||
                null,

            id:
                info.id ||
                null,

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
                null,

            views:
                info.view_count ||
                0,

            likes:
                info.like_count ||
                0,

            comments:
                info.comment_count ||
                0,

            reposts:
                info.repost_count ||
                0,

            saves:
                info.save_count ||
                0,

            images:
                getImages(info),

            url,

            resolved_url:
                info.webpage_url ||
                url,

            source:
                info.webpage_url ||
                url,

            expires_in:
                '30 minutes'

        })

    } catch (error) {

        return res.status(500).json({

            status: false,

            code: 500,

            error:
                'TikTok Extraction Error',

            message:
                'No se pudo descargar el video de TikTok',

            detail:
                error.message

        })

    }

}


// ==========================================
// SERVIR MP4
// ==========================================

async function serveTikTokFile(req, res) {

    cleanOldFiles()

    const filename =
        path.basename(req.params.filename)


    if (
        !filename.endsWith('.mp4') ||
        filename.includes('..')
    ) {

        return res.status(400).json({

            status: false,

            code: 400,

            error:
                'Archivo inválido'

        })

    }


    const filePath =
        path.join(
            DOWNLOAD_DIR,
            filename
        )


    if (!fs.existsSync(filePath)) {

        return res.status(404).json({

            status: false,

            code: 404,

            error:
                'Video no encontrado',

            message:
                'El archivo expiró o ya fue eliminado'

        })

    }


    const stat =
        fs.statSync(filePath)


    if (
        Date.now() - stat.mtimeMs >
        FILE_LIFETIME
    ) {

        try {
            fs.unlinkSync(filePath)
        } catch {}

        return res.status(404).json({

            status: false,

            code: 404,

            error:
                'Video expirado'

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

    res.setHeader(
        'Cache-Control',
        'no-cache'
    )


    return res.sendFile(
        filePath
    )

}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = tiktokdl

module.exports.serveTikTokFile =
    serveTikTokFile
