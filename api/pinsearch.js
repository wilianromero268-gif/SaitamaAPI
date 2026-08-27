const axios = require('axios')

const DELIRIUS_API =
    'https://api.delirius.online/search/pinterestv2'

async function pinsearch(req, res) {
    const query = String(req.query.q || req.query.text || '').trim()

    let limit = parseInt(req.query.limit || '10', 10)

    if (!query) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Missing Query',
            message: 'Debes proporcionar una búsqueda de Pinterest'
        })
    }

    if (isNaN(limit) || limit < 1) {
        limit = 10
    }

    if (limit > 10) {
        limit = 10
    }

    try {
        const response = await axios.get(
            DELIRIUS_API,
            {
                params: {
                    text: query
                },
                timeout: 30000
            }
        )

        const apiData = response.data

        if (!apiData?.status || !Array.isArray(apiData?.data)) {
            return res.status(404).json({
                status: false,
                code: 404,
                creator: 'SaiDev145',
                error: 'No Results',
                message: 'No se encontraron resultados'
            })
        }

        const results = apiData.data
            .slice(0, limit)
            .map((item, index) => ({
                position: index + 1,
                id: item.id || null,
                title: item.title || null,
                name: item.name || null,
                username: item.username || null,
                profile_image: item.profile_image || null,
                followers: item.followers ?? 0,
                description: item.description || '',
                likes: item.likes ?? 0,
                created_at: item.created_at || null,
                image: item.image || null,

                url: item.id
                    ? `https://www.pinterest.com/pin/${item.id}/`
                    : null
            }))

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: 'pinterest',
            query,
            total: results.length,
            results
        })

    } catch (error) {
        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Pinterest Search Error',
            message: 'No se pudo realizar la búsqueda en Pinterest',
            detail:
                error.response?.data?.message ||
                error.message ||
                'Error desconocido'
        })
    }
}

module.exports = pinsearch
