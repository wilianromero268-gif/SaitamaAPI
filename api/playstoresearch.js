const gplay = require('@mradex77/google-play-scraper').default

async function playstoresearch(req, res) {
    const q = String(req.query.q || '').trim()
    const limit = Math.min(
        Math.max(parseInt(req.query.limit, 10) || 10, 1),
        30
    )

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Missing Query',
            message: 'Debes proporcionar una búsqueda'
        })
    }

    try {
        const results = await gplay.search({
            term: q,
            num: limit
        })

        const data = results.map((app, index) => ({
            position: index + 1,
            title: app.title || null,
            developer: app.developer || null,
            rating: app.score ?? null,
            price: app.priceText || null,
            free: app.free ?? null,
            description: app.summary || null,
            image: app.icon || null,
            package: app.appId || null,
            url: app.url || (
                app.appId
                    ? `https://play.google.com/store/apps/details?id=${app.appId}`
                    : null
            )
        }))

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: 'playstore',
            query: q,
            total: data.length,
            results: data
        })

    } catch (error) {
        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Play Store Search Error',
            message: 'No se pudieron obtener resultados de Google Play',
            detail: error.message || 'Error desconocido'
        })
    }
}

module.exports = playstoresearch
