const { execFile } = require('child_process')

const YTDLP = 'yt-dlp'

function searchTikTok(query) {
    return new Promise((resolve, reject) => {

        const args = [
            `tiktoksearch10:${query}`,
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
                            'TikTok search failed'
                        )
                    )
                }

                try {
                    const data = JSON.parse(stdout)

                    resolve(
                        (data.entries || [])
                            .filter(Boolean)
                            .slice(0, 10)
                    )

                } catch {
                    reject(
                        new Error(
                            'No se pudo procesar la respuesta de TikTok'
                        )
                    )
                }
            }
        )
    })
}

async function tiktoksearch(req, res) {

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

        const entries = await searchTikTok(q.trim())

        const results = entries.map((video, index) => {

            const id = video.id || null

            return {
                position: index + 1,

                id,

                title:
                    video.title ||
                    video.description ||
                    null,

                url:
                    video.webpage_url ||
                    (id
                        ? `https://www.tiktok.com/@${video.uploader_id || video.uploader || ''}/video/${id}`
                        : null),

                thumbnail:
                    video.thumbnail ||
                    null,

                duration:
                    video.duration ||
                    0,

                username:
                    video.uploader_id ||
                    video.uploader ||
                    null,

                author:
                    video.uploader ||
                    video.channel ||
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
            error: 'TikTok Search Error',
            message: 'No se pudo realizar la búsqueda',
            detail: error.message
        })
    }
}

module.exports = tiktoksearch
