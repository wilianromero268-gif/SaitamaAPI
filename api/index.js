const express = require('express')

const app = express()

app.use(express.json())

app.get('/', (req, res) => {
    res.json({
        status: true,
        code: 200,
        creator: 'SaiDev145',
        message: 'Saitama API funcionando',
        version: '1.0.0'
    })
})

app.get('/saitama/api/test', (req, res) => {
    res.json({
        status: true,
        code: 200,
        creator: 'SaiDev145',
        message: 'Test OK'
    })
})

if (require.main === module) {
    app.listen(process.env.PORT || 3000, () => {
        console.log('Saitama API funcionando')
    })
}

module.exports = app
