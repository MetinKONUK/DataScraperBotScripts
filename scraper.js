const puppeteer = require('puppeteer-extra')

puppeteer.use(
    require('puppeteer-extra-plugin-recaptcha')({
        provider: {
            id: '2captcha',
            token: process.env.CAPTCHA_API_TOKEN,
        },
        visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
    })
)
puppeteer.use(require('puppeteer-extra-plugin-stealth')())

/**
 * @class Scraper
 * @description Scrapes the data from bulurum.com
 * @exports Scraper
 * @static {string} BASE_URL - The base URL of the website
 * @static {number} ENTITY_DISPLAY_LIMIT - The maximum number of entities to display
 * @static {number} MAX_ENTITY_PER_PAGE - The maximum number of entities per page
 * @static {function} resultCountScraper - Scrapes the total number of results
 * @static {function} linkScraper - Scrapes the links in a page
 * @static {function} linksScraperForward - Scrapes the links in A-Z order
 * @static {function} linksScraperBackward - Scrapes the links in Z-A order
 * @static {function} targetDataScraper - Scrapes the target link
 */
class Scraper {
    static BASE_URL = 'https://www.bulurum.com/search/'
    static ENTITY_DISPLAY_LIMIT = 200
    static MAX_ENTITY_PER_PAGE = 20

    static getRandomWaitTime() {
        return (Math.random() * (2 - 1) + 1).toFixed(2) * 1000
    }

    static reCAPTCHAFinder = async (page) => {
        const captcha = await page.$('.captchaBox')
        return captcha != null
    }

    /**
     *
     * @param {string} category: The category of the entity
     * @param {string} district: The district of the entity
     * @param {string} city: The city of the entity
     * @returns: The total number of results
     */
    static resultCountScraper = async (category, district, city) => {
        const browser = await puppeteer.launch({
            headless: 'true',
            protocolTimeout: 0,
            defaultViewport: {
                width: 1920,
                height: 1080,
            },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-zygote',
            ],
            executablePath:
                process.env.NODE_ENV === 'production'
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
        })
        const pages = await browser.pages()

        const page = pages[0]
        page.setDefaultTimeout(0)

        const URL = this.BASE_URL + category + '/' + district + '-' + city
        await page.goto(URL)

        // reCAPTCHA here
        if (await this.reCAPTCHAFinder(page)) {
            console.log('reCAPTCHA found')
            await page.solveRecaptchas()
        }

        await page.waitForSelector('span.mainCountTitle', { timeout: 0 })
        const districtEntityCount = await page.evaluate(() => {
            const COUNT = document
                .querySelector('span.mainCountTitle')
                .textContent.split(' ')[0]
            return parseInt(COUNT, 10)
        })

        await browser.close()

        return districtEntityCount
    }

    /**
     *
     * @param {string} URL: The URL of the page to scrape that contains the links
     * @param {puppeteer.browser.page} page: The page object of the browser
     * @returns: The links in the page
     * @description: Scrapes the links in a page
     */
    static linkScraper = async (URL, page) => {
        await page.goto(URL)
        // reCAPTCHA here
        if (await this.reCAPTCHAFinder(page)) {
            console.log('reCAPTCHA found')
            await page.solveRecaptchas()
        }

        await page.waitForSelector('div#SearchResults', { timeout: 0 })
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

        return links
    }

    /**
     *
     * @param {string} category: The category of the entity
     * @param {string} district: The district of the entity
     * @param {string} city: The city of the entity
     * @param {number} pageCount: The number of pages to scrape
     * @returns: The links in A-Z order beginning from the first page
     * @description: Scrapes the links in A-Z order beginning from the first page
     */
    static linksScraperForward = async (
        category,
        district,
        city,
        pageCount
    ) => {
        const browser = await puppeteer.launch({
            headless: 'true',
            protocolTimeout: 0,
            defaultViewport: {
                width: 1920,
                height: 1080,
            },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-zygote',
            ],
            executablePath:
                process.env.NODE_ENV === 'production'
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
        })
        const pages = await browser.pages()
        const page = pages[0]
        page.setDefaultTimeout(0)

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

        browser.close()
        return links
    }

    /**
     *
     * @param {string} category: The category of the entity
     * @param {string} district: The district of the entity
     * @param {string} city: The city of the entity
     * @param {number} pageCount: The number of pages to scrape
     * @returns: The links in Z-A order beginning from the last page
     * @description: Scrapes the links in Z-A order beginning from the last page
     */
    static linksScraperBackward = async (
        category,
        district,
        city,
        pageCount
    ) => {
        const browser = await puppeteer.launch({
            headless: 'true',
            protocolTimeout: 0,
            defaultViewport: {
                width: 1920,
                height: 1080,
            },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-zygote',
            ],
            executablePath:
                process.env.NODE_ENV === 'production'
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
        })
        const pages = await browser.pages()
        const page = pages[0]
        page.setDefaultTimeout(0)

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
        browser.close()
        return links
    }

    static targetDataScraper = async (links) => {
        const browser = await puppeteer.launch({
            headless: 'true',
            protocolTimeout: 0,
            defaultViewport: {
                width: 1920,
                height: 1080,
            },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--no-zygote',
            ],
            executablePath:
                process.env.NODE_ENV === 'production'
                    ? process.env.PUPPETEER_EXECUTABLE_PATH
                    : puppeteer.executablePath(),
        })
        const pages = await browser.pages()
        const page = pages[0]

        let data = []
        for (let [index, link] of links.entries()) {
            await page.goto(link)
            // reCAPTCHA here
            if (await this.reCAPTCHAFinder(page)) {
                console.log('reCAPTCHA found')
                await page.solveRecaptchas()
            }

            // Now wait after the reCAPTCHA is solved
            await page.waitForSelector('#CompanyNameLbl', { timeout: 0 })

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
                            ?.textContent.trim() ?? null
                    let email =
                        document
                            .querySelector('#EmailContLbl > a')
                            ?.textContent.trim() ?? null
                    let instagram =
                        document
                            .querySelector('a:has(#InstagramIcon)')
                            ?.textContent.trim() ?? null

                    address = address?.split('\n')[0] ?? null
                    websiteLink = websiteLink?.includes('http') ?? null
                    email = email?.includes('@') ?? null

                    return [
                        companyName,
                        professions,
                        address,
                        primaryPhone,
                        secondaryPhone,
                        websiteLink,
                        email,
                        instagram,
                    ]
                })

                console.log(
                    index,
                    companyName,
                    professions,
                    address,
                    primaryPhone,
                    secondaryPhone,
                    websiteLink,
                    email,
                    instagram
                )

                data.push({
                    companyName,
                    professions,
                    address,
                    primaryPhone,
                    secondaryPhone,
                    websiteLink,
                    email,
                    instagram,
                })
            } catch (error) {
                console.log(error)
            }
            // wait for 1-2 seconds
            await page.waitForTimeout(Scraper.getRandomWaitTime())
        }

        // console.log(data)
        await browser.close()
        console.log('scraper.js data: ', data)
        return data
    }
}

module.exports = Scraper
