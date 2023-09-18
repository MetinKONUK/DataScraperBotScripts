const express = require('express')
const http = require('http')
const websocket = require('ws')
const cors = require('cors')
require('dotenv').config()
const Scraper = require('./scraper')
const responseMessages = require('./responseMessages')

const PORT = process.env.PORT || 5000

const server = express()
const httpServer = http.createServer(server)
const wss = new websocket.Server({ server: httpServer })

server.use(
    cors({
        origin: 'https://main--bulurum-scrape.netlify.app',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    })
)

// server.use(
//     cors({
//         origin: 'http://localhost:3000',
//         methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
//         credentials: true,
//     })
// )

server.use(
    express.json({
        limit: '10MB',
    })
)

// query example: https://bulurum-scrape.onrender.com/?category=veteriner&city=istanbul&district=sisli
server.get('/', async (req, res) => {
    const { category, district, city } = req.query
    if (category === undefined || district === undefined || city === undefined)
        return res.send(responseMessages['INVALID_REQUEST'])
    console.log('request received: ', category, district, city)

    await Scraper.initializeWebSocket(wss)

    try {
        await Scraper.initializeBrowser()
        Scraper.sendToClient(responseMessages['BROWSER_INITIATED'])
    } catch (error) {
        console.log(error)
        await Scraper.cleanUp()
        return res.send(responseMessages['BROWSER_INITIATION_FAILED'])
    }

    // Get the total number of results
    const resultCount = await Scraper.resultCountScraper(
        category,
        district,
        city
    )

    if (resultCount === 0) {
        await Scraper.cleanUp()
        return res.send(responseMessages['NO_RESULTS_FOUND'])
    }

    // Calculate the number of pages to scrape
    let totalPageCount = Math.ceil(resultCount / Scraper.MAX_ENTITY_PER_PAGE)
    let pageCount = totalPageCount > 10 ? 10 : totalPageCount

    console.log('resultCount: ', resultCount)

    // Scrape the links
    let links = []
    // Scrape the first 10 pages
    const forwardLinks = await Scraper.linksScraperForward(
        category,
        district,
        city,
        pageCount
    )
    links = links.concat(forwardLinks)

    // Scrape the last 10 pages
    if (totalPageCount > 10) {
        pageCount = Math.min(totalPageCount - 10, 10)
        const backwardLinks = await Scraper.linksScraperBackward(
            category,
            district,
            city,
            pageCount
        )

        links = links.concat(
            backwardLinks.slice(
                0,
                Math.min(
                    resultCount - Scraper.ENTITY_DISPLAY_LIMIT,
                    Scraper.ENTITY_DISPLAY_LIMIT
                )
            )
        )
    }

    // Calculate the number of links that are lost
    let loss = (resultCount - Scraper.ENTITY_DISPLAY_LIMIT) << 1

    console.log('scraping links completed, now scraping target data...')
    // Scrape the target data
    try {
        let data = await Scraper.targetDataScraper(links)
        console.log('index.js data: ', data)
        res.send({
            type: 'success',
            payload: {
                data,
                loss,
            },
        })
    } catch (error) {
        console.log(error)
    }

    await Scraper.cleanUp()
})

wss.on('connection', (ws) => {
    console.log('Client connected')
})

httpServer.listen(PORT, () => {
    console.log(`Both ws & express servers listening on port ${PORT}`)
})
