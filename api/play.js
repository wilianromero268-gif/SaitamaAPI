const { execFile } = require('child_process')
const fs = require('fs')
const path = require('path')

const YTDLP = path.join(
    __dirname,
    '..',
    'bin',
    'yt-dlp'
)

const DOWNLOAD_DIR = path.join(
    process.cwd(),
    'tmp',
    'play'
)

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, {
        recursive: true
    })
}

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


// ==========================================
// BUSCAR EN YOUTUBE
// ==========================================

async function searchYouTube(query) {

    const output = await runYtDlp([
        `ytsearch1:${query}`,

        '--dump-single-json',
        '--skip-download',

        '--no-warnings',
        '--no-playlist'
    ])

    const data = JSON.parse(output)

    return data.entries?.[0] || data
}


// ==========================================
// DURACIÓN
// ==========================================

function formatDuration(seconds) {

    if (!seconds) {
        return null
    }

    seconds = Math.floor(
        Number(seconds)
    )

    const hours =
        Math.floor(seconds / 3600)

    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        )

    const secs =
        seconds % 60

    if (hours > 0) {

        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    }

    return `${minutes}:${String(secs).padStart(2, '0')}`
}


// ==========================================
// LIMPIAR ID
// ==========================================

function cleanId(id) {

    return String(id || '')
        .replace(
            /[^a-zA-Z0-9_-]/g,
            ''
        )
        .slice(0, 100)
}


// ==========================================
// DESCARGAR MP3
// ==========================================

async function downloadMp3(
    url,
    outputFile
) {

    await runYtDlp([
        '--no-warnings',
        '--no-playlist',

        '-x',

        '--audio-format',
        'mp3',

        '--audio-quality',
        '192K',

        '--no-part',

        '-o',
        outputFile,

        url
    ])
}


// ==========================================
// PLAY
// ==========================================

async function play(req, res) {

    const query =
        req.query.query ||
        req.query.q

    if (!query) {

        return res.status(400).json({

            status: false,

            code: 400,

            error: 'Bad Request',

            message:
                'El parámetro query es obligatorio',

            usage:
                '/saitama/api/play?query=nombre+cancion'

        })
    }

    try {

        // Buscar canción
        const info =
            await searchYouTube(query)

        if (!info || !info.id) {

            return res.status(404).json({

                status: false,

                code: 404,

                error: 'Not Found',

                message:
                    'No se encontró ningún resultado'

            })
        }


        const id =
            cleanId(info.id)

        const url =
            info.webpage_url ||
            `https://www.youtube.com/watch?v=${id}`


        const outputFile =
            path.join(
                DOWNLOAD_DIR,
                `${id}.mp3`
            )


        // Descargar MP3
        if (!fs.existsSync(outputFile)) {

            await downloadMp3(
                url,
                outputFile
            )

        }


        if (!fs.existsSync(outputFile)) {

            throw new Error(
                'No se generó el archivo MP3'
            )

        }


        const baseUrl =
            `${req.protocol}://${req.get('host')}`


        const downloadUrl =
            `${baseUrl}/saitama/api/play/file/${id}.mp3`


        return res.json({

            status: true,

            code: 200,

            creator: 'SaiDev145',

            type: 'audio',


            id,


            title:
                info.title ||
                null,


            artist:
                info.artist ||
                info.uploader ||
                info.channel ||
                null,


            album:
                info.album ||
                null,


            description:
                info.description ||
                null,


            thumbnail:
                info.thumbnail ||
                null,


            duration:
                formatDuration(
                    info.duration
                ),


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


            // Fecha de publicación
            published:
                info.upload_date ||
                null,


            // URL de YouTube
            url,


            // Tu URL
            audio:
                downloadUrl,


            download:
                downloadUrl,


            format: 'mp3',

            quality: '192kbps'

        })


    } catch (error) {

        console.error(
            'PLAY ERROR:',
            error
        )

        return res.status(500).json({

            status: false,

            code: 500,

            error:
                'YouTube Play Error',

            message:
                'No se pudo buscar o descargar la canción',

            detail:
                error.message

        })

    }

}


// ==========================================
// SERVIR MP3
// ==========================================

async function playFile(req, res) {

    try {

        const id =
            cleanId(
                req.params.id
            )


        if (!id) {

            return res.status(400).json({

                status: false,

                code: 400,

                error:
                    'Invalid ID'

            })

        }


        const file =
            path.join(
                DOWNLOAD_DIR,
                `${id}.mp3`
            )


        if (!fs.existsSync(file)) {

            return res.status(404).json({

                status: false,

                code: 404,

                error:
                    'File Not Found',

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

            error:
                'File Error',

            message:
                'No se pudo enviar el MP3'

        })

    }

}


module.exports = play

module.exports.playFile =
    playFile
