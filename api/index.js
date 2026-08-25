const express = require('express')

const app = express()

app.get('/', (req, res) => {
    res.json({
        status: true,
        message: 'Saitama API funcionando',
        creator: 'SaiDev145'
    })
})

app.get('/saitama/api/test', (req, res) => {
    res.json({
        status: true,
        code: 200,
        message: 'Test OK'
    })
})

module.exports = app
