const fs = require('fs')
const path = require('path')
const os = require('os')

// Vercel permite escritura en /tmp
const DATA_DIR = path.join(
    os.tmpdir(),
    'saitama-api'
)

const STATS_FILE = path.join(
    DATA_DIR,
    'stats.json'
)

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
}

const defaultStats = {
    total: 0,
    today: 0,
    date: new Date().toISOString().slice(0, 10),

    apis: {
        test: 0,
        main: 0,
        ai: 0,
        spotify: 0,
        youtube: 0,
        ytmp3: 0,
        ytmp4: 0,
        play: 0,
        play2: 0,
        ytsearch: 0,
        shazam: 0,
        playstoresearch: 0,
        spotifysearch: 0,
        spotifydl: 0,
        tiktokdl: 0,
        tiktoksearch: 0,
        facebookdl: 0,
        instagramdl: 0,
        pinterestdl: 0,
        pinsearch: 0
    }
}

function cloneDefault() {
    return {
        ...defaultStats,
        apis: {
            ...defaultStats.apis
        }
    }
}

function saveStats(stats) {
    fs.writeFileSync(
        STATS_FILE,
        JSON.stringify(stats, null, 2)
    )
}

function loadStats() {

    try {

        if (!fs.existsSync(STATS_FILE)) {
            const stats = cloneDefault()
            saveStats(stats)
            return stats
        }

        const data = JSON.parse(
            fs.readFileSync(STATS_FILE, 'utf8')
        )

        if (
            !data.apis ||
            typeof data.apis !== 'object'
        ) {
            data.apis = {}
        }

        for (
            const api of Object.keys(defaultStats.apis)
        ) {

            if (
                typeof data.apis[api] !== 'number'
            ) {
                data.apis[api] = 0
            }

        }

        if (typeof data.total !== 'number') {
            data.total = 0
        }

        if (typeof data.today !== 'number') {
            data.today = 0
        }

        if (!data.date) {
            data.date = defaultStats.date
        }

        return data

    } catch (error) {

        console.error(
            'STATS LOAD ERROR:',
            error.message
        )

        const stats = cloneDefault()

        saveStats(stats)

        return stats
    }
}

function resetToday(stats) {

    stats.today = 0

    stats.date =
        new Date()
            .toISOString()
            .slice(0, 10)

    for (
        const api of Object.keys(stats.apis)
    ) {
        stats.apis[api] = 0
    }

}

function updateStats(apiName = 'main') {

    const stats = loadStats()

    const today =
        new Date()
            .toISOString()
            .slice(0, 10)

    if (stats.date !== today) {
        resetToday(stats)
    }

    stats.total++
    stats.today++

    if (
        typeof stats.apis[apiName] !== 'number'
    ) {
        stats.apis[apiName] = 0
    }

    stats.apis[apiName]++

    saveStats(stats)

}

function getStats() {

    const stats = loadStats()

    const today =
        new Date()
            .toISOString()
            .slice(0, 10)

    if (stats.date !== today) {

        resetToday(stats)

        saveStats(stats)
    }

    return stats
}

module.exports = {
    updateStats,
    getStats
}
