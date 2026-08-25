const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const STATS_FILE = path.join(DATA_DIR, 'stats.json')

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
        youtube: 0
    }
}

function loadStats() {

    try {

        if (!fs.existsSync(STATS_FILE)) {
            saveStats(defaultStats)
            return { ...defaultStats }
        }

        const data = JSON.parse(
            fs.readFileSync(STATS_FILE, 'utf8')
        )

        // Compatibilidad con el stats.json antiguo
        if (!data.apis || typeof data.apis !== 'object') {
            data.apis = {}
        }

        const defaultApis = defaultStats.apis

        for (const api of Object.keys(defaultApis)) {

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

        saveStats(data)

        return data

    } catch (error) {

        saveStats(defaultStats)

        return {
            ...defaultStats,
            apis: { ...defaultStats.apis }
        }

    }
}

function saveStats(stats) {

    fs.writeFileSync(
        STATS_FILE,
        JSON.stringify(stats, null, 2)
    )

}

function updateStats(apiName = 'main') {

    const stats = loadStats()

    const today =
        new Date().toISOString().slice(0, 10)

    if (stats.date !== today) {

        stats.today = 0
        stats.date = today

        for (const api of Object.keys(stats.apis)) {
            stats.apis[api] = 0
        }

    }

    stats.total++
    stats.today++

    if (typeof stats.apis[apiName] !== 'number') {
        stats.apis[apiName] = 0
    }

    stats.apis[apiName]++

    saveStats(stats)

}

function getStats() {

    const stats = loadStats()

    const today =
        new Date().toISOString().slice(0, 10)

    if (stats.date !== today) {

        stats.today = 0
        stats.date = today

        for (const api of Object.keys(stats.apis)) {
            stats.apis[api] = 0
        }

        saveStats(stats)
    }

    return stats

}

module.exports = {
    updateStats,
    getStats
}
