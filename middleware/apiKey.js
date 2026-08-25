const API_KEY = process.env.API_KEY

function validateApiKey(req, res, next) {

    const apiKey = req.query.apikey

    if (!apiKey) {

        return res.status(401).json({
            status: false,
            code: 401,
            error: 'Unauthorized',
            message: 'API key is required'
        })

    }

    if (!API_KEY || apiKey !== API_KEY) {

        return res.status(403).json({
            status: false,
            code: 403,
            error: 'Forbidden',
            message: 'Invalid API key'
        })

    }

    next()
}

module.exports = validateApiKey
