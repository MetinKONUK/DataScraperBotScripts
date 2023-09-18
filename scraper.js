const puppeteer = require('puppeteer-extra')
const websocket = require('ws')
const responseMessages = require('./responseMessages')
const { v4: uuidv4 } = require('uuid')

puppeteer.use(
    require('puppeteer-extra-plugin-recaptcha')({
        provider: {
            id: '2captcha',
            token: process.env.CAPTCHA_API_TOKEN,
        },
        visualFeedback: false,
    })
)

puppeteer.use(require('puppeteer-extra-plugin-stealth')())

class Scraper {
    static BASE_URL = 'https://www.bulurum.com/search/'
    static ENTITY_DISPLAY_LIMIT = 200
    static MAX_ENTITY_PER_PAGE = 20
    static browser = null
    static PROTOCOL_TIMEOUT = 120 * 1000
    static wsServer = null

    static sendToClient = (message) => {
        console.log('sending to client: ')
        this.wsServer.clients.forEach((client) => {
            if (client.readyState === websocket.OPEN) {
                client.send(JSON.stringify(message))
            }
        })
    }

    static initializeWebSocket = async (wsServer) => {
        this.wsServer = wsServer
    }

    static initializeBrowser = async () => {
        this.BASE_URL = 'https://www.bulurum.com/search/'
        this.ENTITY_DISPLAY_LIMIT = 200
        this.MAX_ENTITY_PER_PAGE = 20
        this.browser = null
        this.PROTOCOL_TIMEOUT = 120 * 1000
        this.browser = await (async () => {
            return puppeteer.launch({
                headless: 'new',
                protocolTimeout: this.PROTOCOL_TIMEOUT,
                defaultViewport: {
                    width: 1920,
                    height: 1080,
                },
                args: [`--proxy-server=http://87.251.18.203:50100`],
                executablePath:
                    process.env.NODE_ENV === 'production'
                        ? process.env.PUPPETEER_EXECUTABLE_PATH
                        : puppeteer.executablePath(),
            })
        })()
    }

    static cleanUp = async () => {
        try {
            await this.browser.close()
            this.sendToClient(responseMessages['BROWSER_CLOSED'])
        } catch (error) {
            console.log(error)
            this.sendToClient(responseMessages['BROWSER_CLOSING_FAILED'])
        }

        this.browser = null
        this.BASE_URL = null
        this.ENTITY_DISPLAY_LIMIT = null
        this.MAX_ENTITY_PER_PAGE = null
        this.PROTOCOL_TIMEOUT = null
    }

    static getRandomWaitTime(start = 0, end = 0.5) {
        return (Math.random() * (end - start) + start).toFixed(2) * 1000
    }

    static reCAPTCHAFinder = async (page) => {
        const captcha = await page.$('.captchaBox')
        if (captcha) {
            this.sendToClient(responseMessages['RECAPTCHA_FOUND'])
        }
        return captcha != null
    }

    static noResultFinder = async (page) => {
        const noResultsContainer = await page.$('div.noResultsContainer')
        const surrogateResultsContainer = await page.$(
            '#surrogateResultsContainer'
        )
        return noResultsContainer != null || surrogateResultsContainer != null
    }

    static resultCountScraper = async (category, district, city) => {
        const pages = await this.browser.pages()
        const page = pages[0]

        await page.authenticate({
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD,
        })

        const URL = this.BASE_URL + category + '/' + district + '-' + city
        await page.goto(URL)

        if (await this.reCAPTCHAFinder(page)) {
            try {
                await page.solveRecaptchas()
                this.sendToClient(responseMessages['RECAPTCHA_SOLVED'])
            } catch (error) {
                console.log(error)
                this.sendToClient(responseMessages['RECAPTCHA_SOLVING_FAILED'])
            }
        }

        if (await this.noResultFinder(page)) {
            return 0
        }

        await page.waitForSelector('span.mainCountTitle', {
            timeout: 5 * 1000,
        })
        const districtEntityCount = await page.evaluate(() => {
            const COUNT = document
                .querySelector('span.mainCountTitle')
                .textContent.split(' ')[0]
            return parseInt(COUNT, 10)
        })
        let message = responseMessages['TOTAL_RESULTS_COUNT']
        message.payload.totalResultsCount = districtEntityCount
        message.payload.estimatedLoss = -1
        this.sendToClient(message)
        return districtEntityCount
    }

    static linkScraper = async (URL, page) => {
        await page.goto(URL)
        if (await this.reCAPTCHAFinder(page)) {
            try {
                await page.solveRecaptchas()
                this.sendToClient(responseMessages['RECAPTCHA_SOLVED'])
            } catch (error) {
                console.log(error)
                this.sendToClient(responseMessages['RECAPTCHA_SOLVING_FAILED'])
            }
        }

        try {
            await page.waitForSelector('div#SearchResults', {
                timeout: 120 * 1000,
            })
            const links = await page.evaluate(() => {
                const RESULTS_HTML = document.querySelector('div#SearchResults')
                const LINKS_HTML = RESULTS_HTML.querySelectorAll(
                    'a.FreeListingAreaBottomRight'
                )
                let links = []
                LINKS_HTML.forEach((link) => {
                    links.push(link.href)
                })
                return links
            })
            this.sendToClient(responseMessages['INDIVIDUAL_LINKS_PAGE_SCRAPED'])
            return links
        } catch (error) {
            console.log(error)
            this.sendToClient(
                responseMessages['INDIVIDUAL_LINKS_PAGE_SCRAPING_FAILED']
            )
        }
    }

    static linksScraperForward = async (
        category,
        district,
        city,
        pageCount
    ) => {
        const pages = await this.browser.pages()
        const page = pages[0]
        await page.authenticate({
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD,
        })

        let links = []
        for (let i = 0; i < pageCount; i++) {
            const pageAttrb = i == 0 ? '' : `/?page=${i}`
            const orderAttrb = i == 0 ? '?Order=AtoZ' : `&Order=AtoZ`
            const URL =
                this.BASE_URL +
                category +
                '/' +
                district +
                '-' +
                city +
                pageAttrb +
                orderAttrb
            await page.waitForTimeout(Scraper.getRandomWaitTime())
            links = links.concat(await this.linkScraper(URL, page))
        }

        return links
    }

    static linksScraperBackward = async (
        category,
        district,
        city,
        pageCount
    ) => {
        const pages = await this.browser.pages()
        const page = pages[0]
        await page.authenticate({
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD,
        })

        let links = []
        for (let i = 0; i < pageCount; i++) {
            const pageAttrb = i == 0 ? '' : `/?page=${i}`
            const orderAttrb = i == 0 ? '?Order=ZtoA' : `&Order=ZtoA`
            const URL =
                this.BASE_URL +
                category +
                '/' +
                district +
                '-' +
                city +
                pageAttrb +
                orderAttrb

            links = links.concat(await this.linkScraper(URL, page))
        }
        return links
    }

    static targetDataScraper = async (links) => {
        const pages = await this.browser.pages()
        const page = pages[0]

        await page.authenticate({
            username: process.env.PROXY_USERNAME,
            password: process.env.PROXY_PASSWORD,
        })

        let data = []
        for (let [index, link] of links.entries()) {
            await page.goto(link)
            if (await this.reCAPTCHAFinder(page)) {
                try {
                    await page.solveRecaptchas()
                    this.sendToClient(responseMessages['RECAPTCHA_SOLVED'])
                } catch (error) {
                    console.log(error)
                    this.sendToClient(
                        responseMessages['RECAPTCHA_SOLVING_FAILED']
                    )
                }
            }

            await page.waitForSelector('#CompanyNameLbl', {
                timeout: 120 * 1000,
            })

            try {
                let [
                    companyName,
                    professions,
                    address,
                    primaryPhone,
                    secondaryPhone,
                    websiteLink,
                    email,
                    instagram,
                    facebook,
                    mapLink,
                ] = await page.evaluate(() => {
                    let companyName =
                        document
                            .querySelector('#CompanyNameLbl')
                            ?.textContent.trim() ?? null
                    let professions =
                        document
                            .querySelector('#ProfessionLbl')
                            ?.textContent.trim() ?? null
                    let address =
                        document
                            .querySelector('#AddressLbl')
                            ?.textContent.trim() ?? null
                    let primaryPhone =
                        document
                            .querySelector('.rc_firstphone')
                            ?.textContent.trim() ?? null
                    let secondaryPhone =
                        document
                            .querySelector('#MobileContLbl')
                            ?.textContent.trim() ?? null
                    let websiteLink =
                        document
                            .querySelector('#WebsiteContLbl > a')
                            ?.href.trim() ?? null
                    let email =
                        document
                            .querySelector('#EmailContLbl > a')
                            ?.href.trim() ?? null
                    let instagram =
                        document
                            .querySelector('a:has(#InstagramIcon)')
                            ?.href.trim() ?? null
                    let facebook =
                        document
                            .querySelector('a:has(#FacebookIcon)')
                            ?.href.trim() ?? null
                    let mapLink =
                        document.querySelector('#viewInMapId')?.href.trim() ??
                        null

                    address = address?.split('\n')[0] ?? null
                    websiteLink = websiteLink?.includes('http')
                        ? websiteLink
                        : null
                    email = email?.includes('@') ? email : null

                    return [
                        companyName,
                        professions,
                        address,
                        primaryPhone,
                        secondaryPhone,
                        websiteLink,
                        email,
                        instagram,
                        facebook,
                        mapLink,
                    ]
                })

                data.push({
                    id: uuidv4().substring(0, 8),
                    companyName,
                    professions,
                    address,
                    primaryPhone,
                    secondaryPhone,
                    websiteLink,
                    email,
                    instagram,
                    facebook,
                    mapLink,
                })
                this.sendToClient(responseMessages['INDIVIDUAL_ENTITY_SCRAPED'])
            } catch (error) {
                console.log(error)
                this.sendToClient(
                    responseMessages['INDIVIDUAL_ENTITY_SCRAPING_FAILED']
                )
            }
            await page.waitForTimeout(Scraper.getRandomWaitTime())
        }

        return data
    }
}

module.exports = Scraper
