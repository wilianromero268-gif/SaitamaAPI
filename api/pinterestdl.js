const axios = require('axios')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const TMP_DIR = path.join(
    process.cwd(),
    'tmp',
    'pinterestdl'
)

const EXPIRE_TIME = 30 * 60 * 1000

const DELIRIUS_API =
    'https://api.delirius.online/download/pinterestdl'

if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, {
        recursive: true
    })
}

const files = new Map()

function generateId() {
    return crypto
        .randomBytes(8)
        .toString('hex')
}

function safeFileName(name) {
    return String(name || 'Pinterest')
        .replace(
            /[<>:"/\\|?*\x00-\x1F]/g,
            ''
        )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100)
}

function getExtensionFromType(
    type,
    url,
    contentType
) {
    const cleanUrl =
        String(url || '')
            .split('?')[0]
            .toLowerCase()

    const urlExt =
        path.extname(cleanUrl)

    const validImageExtensions = [
        '.jpg',
        '.jpeg',
        '.png',
        '.webp',
        '.gif'
    ]

    if (
        validImageExtensions.includes(
            urlExt
        )
    ) {
        return urlExt
    }

    if (
        String(type).toLowerCase() ===
        'video'
    ) {
        return '.mp4'
    }

    const ct =
        String(contentType || '')
            .toLowerCase()

    if (ct.includes('png')) {
        return '.png'
    }

    if (ct.includes('webp')) {
        return '.webp'
    }

    if (ct.includes('gif')) {
        return '.gif'
    }

    if (ct.includes('mp4')) {
        return '.mp4'
    }

    return '.jpg'
}

function getContentType(ext) {
    switch (ext) {
        case '.mp4':
            return 'video/mp4'

        case '.png':
            return 'image/png'

        case '.webp':
            return 'image/webp'

        case '.gif':
            return 'image/gif'

        case '.jpeg':
        case '.jpg':
        default:
            return 'image/jpeg'
    }
}

function scheduleDelete(
    id,
    filePath
) {
    setTimeout(() => {
        try {
            if (
                fs.existsSync(
                    filePath
                )
            ) {
                fs.unlinkSync(
                    filePath
                )
            }
        } catch {}

        files.delete(id)
    }, EXPIRE_TIME)
}

async function downloadFile(
    url,
    filePath
) {
    const response =
        await axios.get(
            url,
            {
                responseType:
                    'arraybuffer',

                timeout: 120000,

                maxRedirects: 10,

                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/131.0 Mobile Safari/537.36',

                    'Referer':
                        'https://www.pinterest.com/'
                }
            }
        )

    if (
        !response.data ||
        !response.data.length
    ) {
        throw new Error(
            'El servidor no devolvió ningún archivo'
        )
    }

    fs.writeFileSync(
        filePath,
        response.data
    )

    return {
        contentType:
            response.headers[
                'content-type'
            ] || ''
    }
}

async function pinterestdl(
    req,
    res
) {
    const pinterestUrl =
        req.query.url

    if (!pinterestUrl) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Missing URL',
            message:
                'Debes proporcionar una URL de Pinterest'
        })
    }

    let parsedUrl

    try {
        parsedUrl =
            new URL(
                pinterestUrl
            )
    } catch {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Invalid URL',
            message:
                'La URL proporcionada no es válida'
        })
    }

    const host =
        parsedUrl.hostname
            .toLowerCase()
            .replace(
                /^www\./,
                ''
            )

    if (
        host !== 'pinterest.com' &&
        !host.endsWith(
            '.pinterest.com'
        ) &&
        host !== 'pin.it'
    ) {
        return res.status(400).json({
            status: false,
            code: 400,
            creator: 'SaiDev145',
            error: 'Invalid URL',
            message:
                'La URL debe pertenecer a Pinterest'
        })
    }

    let id = null
    let filePath = null

    try {
        /*
         * =====================================
         * DELIRIUS
         * =====================================
         */

        const apiResponse =
            await axios.get(
                DELIRIUS_API,
                {
                    params: {
                        url:
                            pinterestUrl
                    },

                    timeout: 60000
                }
            )

        const body =
            apiResponse.data

        if (
            !body?.status ||
            !body?.data
        ) {
            throw new Error(
                'La API de Delirius no devolvió datos válidos'
            )
        }

        const data =
            body.data

        const download =
            data.download

        if (
            !download ||
            !download.url
        ) {
            throw new Error(
                'La API de Delirius no devolvió un enlace de descarga'
            )
        }

        /*
         * =====================================
         * INFORMACIÓN
         * =====================================
         */

        const title =
            data.title ||
            'Pinterest'

        const description =
            data.description ||
            ''

        const thumbnail =
            data.thumbnail ||
            null

        const source =
            data.source ||
            pinterestUrl

        const authorName =
            data.author_name ||
            null

        const username =
            data.username ||
            null

        const followers =
            data.followers ??
            null

        const comments =
            data.comments ??
            null

        const likes =
            data.likes ??
            null

        const upload =
            data.upload ||
            null

        /*
         * =====================================
         * TIPO
         * =====================================
         */

        const type =
            String(
                download.type ||
                ''
            ).toLowerCase()

        if (
            type !== 'video' &&
            type !== 'image'
        ) {
            throw new Error(
                `Tipo de descarga no compatible: ${type || 'desconocido'}`
            )
        }

        /*
         * =====================================
         * ID Y NOMBRE
         * =====================================
         */

        id =
            generateId()

        const safeTitle =
            safeFileName(
                title
            ) ||
            'Pinterest'

        /*
         * =====================================
         * DESCARGAR
         * =====================================
         */

        const result =
            await downloadFile(
                download.url,
                path.join(
                    TMP_DIR,
                    `${id}.tmp`
                )
            )

        const ext =
            getExtensionFromType(
                type,
                download.url,
                result.contentType
            )

        const fileName =
            `${safeTitle}${ext}`

        const tempPath =
            path.join(
                TMP_DIR,
                `${id}.tmp`
            )

        filePath =
            path.join(
                TMP_DIR,
                `${id}${ext}`
            )

        if (
            fs.existsSync(
                tempPath
            )
        ) {
            fs.renameSync(
                tempPath,
                filePath
            )
        }

        /*
         * =====================================
         * COMPROBAR ARCHIVO
         * =====================================
         */

        if (
            !fs.existsSync(
                filePath
            )
        ) {
            throw new Error(
                'El archivo no fue creado correctamente'
            )
        }

        const stats =
            fs.statSync(
                filePath
            )

        if (
            stats.size <= 0
        ) {
            throw new Error(
                'El archivo descargado está vacío'
            )
        }

        /*
         * =====================================
         * GUARDAR EN MEMORIA
         * =====================================
         */

        files.set(
            id,
            {
                filePath,
                fileName,
                type,
                createdAt:
                    Date.now()
            }
        )

        scheduleDelete(
            id,
            filePath
        )

        /*
         * =====================================
         * URL COMPLETA
         * =====================================
         */

        const baseUrl =
            `${req.protocol}://${req.get('host')}`

        const downloadUrl =
            `${baseUrl}/saitama/api/pinterestdl/file/${id}${ext}`

        /*
         * =====================================
         * RESPUESTA
         * =====================================
         */

        return res.json({
            status: true,
            code: 200,
            creator: 'SaiDev145',

            type,

            source:
                'Pinterest',

            data: {
                id:
                    data.id ||
                    null,

                title,

                description,

                comments,

                likes,

                thumbnail,

                upload,

                source,

                author_name:
                    authorName,

                username,

                followers,

                filename:
                    fileName,

                download:
                    downloadUrl,

                expires_in:
                    '30 minutos'
            }
        })

    } catch (error) {
        /*
         * =====================================
         * LIMPIAR SI FALLA
         * =====================================
         */

        if (filePath) {
            try {
                if (
                    fs.existsSync(
                        filePath
                    )
                ) {
                    fs.unlinkSync(
                        filePath
                    )
                }
            } catch {}
        }

        if (id) {
            files.delete(
                id
            )

            const tempPath =
                path.join(
                    TMP_DIR,
                    `${id}.tmp`
                )

            try {
                if (
                    fs.existsSync(
                        tempPath
                    )
                ) {
                    fs.unlinkSync(
                        tempPath
                    )
                }
            } catch {}
        }

        return res.status(500).json({
            status: false,
            code: 500,
            creator: 'SaiDev145',

            error:
                'Pinterest Download Error',

            message:
                'No se pudo procesar el contenido de Pinterest',

            detail:
                error.response?.data?.message ||
                error.message ||
                'Error desconocido'
        })
    }
}

function pinterestdlFile(
    req,
    res
) {
    const id =
        req.params.id

    const requestedExt =
        req.params.ext
            ? `.${req.params.ext.toLowerCase()}`
            : ''

    const file =
        files.get(id)

    if (!file) {
        return res.status(404).json({
            status: false,
            code: 404,
            creator: 'SaiDev145',
            error: 'File Not Found',
            message:
                'El archivo no existe o ya expiró'
        })
    }

    if (
        !fs.existsSync(
            file.filePath
        )
    ) {
        files.delete(
            id
        )

        return res.status(404).json({
            status: false,
            code: 404,
            creator: 'SaiDev145',
            error: 'File Not Found',
            message:
                'El archivo ya fue eliminado'
        })
    }

    const realExt =
        path.extname(
            file.filePath
        ).toLowerCase()

    if (
        requestedExt &&
        requestedExt !== realExt
    ) {
        return res.status(404).json({
            status: false,
            code: 404,
            creator: 'SaiDev145',
            error:
                'Invalid Extension',

            message:
                'La extensión del archivo no coincide'
        })
    }

    res.setHeader(
        'Content-Type',
        getContentType(
            realExt
        )
    )

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.fileName}"`
    )

    res.setHeader(
        'Cache-Control',
        'no-store'
    )

    res.setHeader(
        'Accept-Ranges',
        'bytes'
    )

    return res.sendFile(
        path.resolve(
            file.filePath
        )
    )
}

module.exports =
    pinterestdl

module.exports.pinterestdlFile =
    pinterestdlFile
