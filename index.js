require('dotenv').config()

const express = require('express')
const path = require('path')

const validateApiKey = require('./middleware/apiKey')
const apiHandler = require('./api')

const { updateStats, getStats } =
    require('./middleware/stats')

const ytsearch = require('./api/ytsearch')
const tiktokdl = require('./api/tiktokdl')
const tiktoksearch = require('./api/tiktoksearch')
const ytmp4 = require('./api/ytmp4')
const ytmp3 = require('./api/ytmp3')
const play = require('./api/play')
const play2 = require('./api/play2')

const app = express()

app.use(express.json())
app.set('json spaces', 2)


// WEB
app.use(express.static(
    path.join(__dirname, 'public')
))

app.get('/', (req, res) => {
    res.sendFile(
        path.join(__dirname, 'public', 'index.html')
    )
})


// API PRINCIPAL
app.get(
    '/saitama/api',
    validateApiKey,
    (req, res) => {
        updateStats('main')
        apiHandler(req, res)
    }
)


// TEST
app.get(
    '/saitama/api/test',
    validateApiKey,
    (req, res) => {
        updateStats('test')

        res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            message: 'Saitama API is working'
        })
    }
)


// STATS
app.get(
    '/saitama/api/stats',
    validateApiKey,
    (req, res) => {
        res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',
            data: getStats()
        })
    }
)


// YTMP3
app.get(
    '/saitama/api/ytmp3',
    validateApiKey,
    (req, res) => {
        updateStats('ytmp3')
        ytmp3(req, res)
    }
)

app.get(
    '/saitama/api/ytmp3/file/:id.mp3',
    validateApiKey,
    ytmp3.ytmp3File
)


// YTMP4
app.get(
    '/saitama/api/ytmp4',
    validateApiKey,
    (req, res) => {
        updateStats('ytmp4')
        ytmp4(req, res)
    }
)

app.get(
    '/saitama/api/ytmp4/file/:id.mp4',
    validateApiKey,
    ytmp4.ytmp4File
)


// PLAY MP3
app.get(
    '/saitama/api/play',
    validateApiKey,
    (req, res) => {
        updateStats('play')
        play(req, res)
    }
)

app.get(
    '/saitama/api/play/file/:id.mp3',
    validateApiKey,
    play.playFile
)


// PLAY VIDEO
app.get(
    '/saitama/api/play2',
    validateApiKey,
    (req, res) => {
        updateStats('play2')
        play2(req, res)
    }
)

app.get(
    '/saitama/api/play2/file/:id.mp4',
    validateApiKey,
    play2.play2File
)


// YOUTUBE SEARCH
app.get(
    '/saitama/api/ytsearch',
    validateApiKey,
    (req, res) => {
        updateStats('ytsearch')
        ytsearch(req, res)
    }
)


// TIKTOK DOWNLOAD
app.get(
    '/saitama/api/tiktokdl',
    validateApiKey,
    (req, res) => {
        updateStats('tiktokdl')
        tiktokdl(req, res)
    }
)


// TIKTOK SEARCH
app.get(
    '/saitama/api/tiktoksearch',
    validateApiKey,
    (req, res) => {
        updateStats('tiktoksearch')
        tiktoksearch(req, res)
    }
)


// 404
app.use((req, res) => {
    res.status(404).json({
        status: false,
        code: 404,
        error: 'Not Found',
        message: 'The requested endpoint was not found'
    })
})


// ERROR
app.use((err, req, res, next) => {
    console.error(err)

    res.status(500).json({
        status: false,
        code: 500,
        error: 'Internal Server Error',
        message: err.message
    })
})


// VERCEL
module.exports = app
