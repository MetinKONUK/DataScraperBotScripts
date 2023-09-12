const express = require('express')
const server = express()
const cors = require('cors')

require('dotenv').config()

const Scraper = require('./scraper')

const PORT = process.env.PORT || 5000

server.use(
    cors({
        origin: 'https://65003cc2ef5814556ca47f45--wonderful-kitsune-f7cfe5.netlify.app',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    })
)

server.use(
    express.json({
        limit: '10MB',
    })
)

server.get('/', async (req, res) => {
    // query example: https://bulurum-scrape.onrender.com/?category=veteriner&city=istanbul&district=sisli
    const { category, district, city } = req.query
    if (category === undefined || district === undefined || city === undefined)
        return res.send('Please provide all the required parameters.')

    console.log('request received: ', category, district, city)
    // Get the total number of results
    const resultCount = await Scraper.resultCountScraper(
        category,
        district,
        city
    )

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
        res.send({ data, loss })
    } catch (error) {
        console.log(error)
    }
})

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))
