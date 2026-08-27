const axios = require('axios')

const API_URL = 'https://api.delirius.online/search/spotifysearchweb'

async function spotifysearch(req, res) {
    const q = String(req.query.q || '').trim()

    let limit = parseInt(req.query.limit, 10)

    if (!q) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Bad Request',
            message: 'El parámetro q es obligatorio',
            example: '/saitama/api/spotifysearch?q=Twice&limit=10'
        })
    }

    if (isNaN(limit) || limit < 1) {
        limit = 10
    }

    if (limit > 10) {
        limit = 10
    }

    try {
        const response = await axios.get(API_URL, {
            params: {
                q,
                limit
            },
            timeout: 20000,
            headers: {
                'User-Agent': 'SaitamaAPI/1.0',
                'Accept': 'application/json'
            }
        })

        const data = Array.isArray(response.data?.data)
            ? response.data.data
            : []

        const results = data.slice(0, limit).map((track, index) => ({
            position: index + 1,
            id: track.id || null,
            title: track.title || null,
            artist: track.artist || null,
            album: track.album || null,
            duration: track.duration || null,
            url: track.url || null,
            image: track.image || null
        }))

        return res.status(200).json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            type: 'spotify',
            query: q,
            total: results.length,
            results
        })

    } catch (error) {
        let detail = error.message

        if (error.response) {
            detail = `HTTP ${error.response.status}`

            if (error.response.data?.message) {
                detail += `: ${error.response.data.message}`
            }
        }

        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',
            error: 'Spotify Search Error',
            message: 'No se pudieron obtener los resultados de Spotify',
            detail
        })
    }
}

module.exports = spotifysearch
