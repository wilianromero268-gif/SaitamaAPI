const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const YTDLP = 'yt-dlp'

async function extractTikTok(url) {

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

async function tiktoksearch(req, res) {

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

    if (!/tiktok\.com/i.test(url)) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Invalid URL',
            message: 'La URL no parece ser de TikTok'
        })
    }

    try {

        const info = await extractTikTok(url)

        const entries = Array.isArray(info.entries)
            ? info.entries
            : [info]

        const results = entries
            .filter(Boolean)
            .slice(0, 7)
            .map(item => {

                const id =
                    item.id || null

                const username =
                    item.uploader ||
                    item.uploader_id ||
                    null

                return {
                    type: 'video',

                    id,

                    title:
                        item.title ||
                        item.description ||
                        null,

                    description:
                        item.description ||
                        null,

                    url:
                        item.webpage_url ||
                        item.original_url ||
                        null,

                    thumbnail:
                        item.thumbnail ||
                        null,

                    author: {
                        username,
                        name:
                            item.channel ||
                            item.uploader ||
                            null,

                        id:
                            item.uploader_id ||
                            null
                    },

                    duration:
                        item.duration || 0,

                    views:
                        item.view_count || 0,

                    likes:
                        item.like_count || 0,

                    comments:
                        item.comment_count || 0,

                    shares:
                        item.repost_count ||
                        item.share_count ||
                        0,

                    created_at:
                        item.timestamp ||
                        null
                }
            })

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',

            total: results.length,

            results
        })

    } catch (error) {

        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',

            error: 'TikTok Search Error',

            message:
                'No se pudo obtener la información de TikTok',

            detail:
                error.message
        })
    }
}

module.exports = tiktoksearch
