const { execFile } = require('child_process')

const YTDLP = 'yt-dlp'

function formatDuration(seconds) {

    if (!seconds || isNaN(seconds)) {
        return 'Desconocido'
    }

    seconds = Math.floor(Number(seconds))

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
        return `${hours}h ${minutes}min ${String(secs).padStart(2, '0')}seg`
    }

    return `${minutes}min ${String(secs).padStart(2, '0')}seg`
}

function formatDate(date) {

    if (!date || date.length !== 8) {
        return null
    }

    return `${date.slice(6, 8)}/${date.slice(4, 6)}/${date.slice(0, 4)}`
}

function searchYouTube(query) {

    return new Promise((resolve, reject) => {

        const args = [
            `ytsearch10:${query}`,
            '--dump-single-json',
            '--skip-download',
            '--no-warnings',
            '--ignore-errors'
        ]

        execFile(
            YTDLP,
            args,
            {
                maxBuffer: 50 * 1024 * 1024,
                timeout: 120000
            },
            (error, stdout, stderr) => {

                if (error && !stdout) {
                    return reject(
                        new Error(
                            stderr?.trim() ||
                            error.message ||
                            'yt-dlp search failed'
                        )
                    )
                }

                try {

                    const data = JSON.parse(stdout)

                    resolve(data.entries || [])

                } catch (err) {

                    reject(
                        new Error(
                            'No se pudo procesar la respuesta de yt-dlp'
                        )
                    )

                }

            }
        )

    })
}

async function ytsearch(req, res) {

    const q = req.query.q

    if (!q || !q.trim()) {

        return res.status(400).json({
            status: false,
            code: 400,
            error: 'Bad Request',
            message: 'El parámetro q es obligatorio'
        })

    }

    try {

        const entries = await searchYouTube(q.trim())

        const results = entries
            .filter(Boolean)
            .slice(0, 10)
            .map(video => {

                const id = video.id || null

                return {

                    id,

                    title:
                        video.title ||
                        null,

                    url:
                        video.webpage_url ||
                        (id
                            ? `https://www.youtube.com/watch?v=${id}`
                            : null),

                    thumbnail:
                        video.thumbnail ||
                        (id
                            ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
                            : null),

                    duration:
                        formatDuration(video.duration),

                    duration_seconds:
                        video.duration ||
                        null,

                    channel:
                        video.channel ||
                        video.uploader ||
                        null,

                    channel_url:
                        video.channel_url ||
                        video.uploader_url ||
                        null,

                    published:
                        formatDate(video.upload_date),

                    published_raw:
                        video.upload_date ||
                        null,

                    views:
                        video.view_count ||
                        0,

                    likes:
                        video.like_count ||
                        0,

                    comments:
                        video.comment_count ||
                        0,

                    description:
                        video.description ||
                        null

                }

            })

        return res.json({

            status: true,

            code: 200,

            creator: 'SaiDev145',

            query: q,

            total: results.length,

            results

        })

    } catch (error) {

        return res.status(500).json({

            status: false,

            code: 500,

            error: 'Search Error',

            message:
                'No se pudo realizar la búsqueda',

            detail:
                error.message

        })

    }

}

module.exports = ytsearch
