function apiHandler(req, res) {

    res.status(200).json({
        status: true,
        code: 200,
        creator: 'SaiDev145',
        message: 'Saitama API funcionando',
        version: '1.0.0'
    })

}

module.exports = apiHandler
