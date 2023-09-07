const puppeteer = require('puppeteer-extra')

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

    /**
     *
     * @param {*} category: The category of the entity
     * @param {*} district: The district of the entity
     * @param {*} city: The city of the entity
     * @returns: The total number of results
     */
    static resultCountScraper = async (category, district, city) => {
        const browser = await puppeteer.launch({ headless: false })
        const pages = await browser.pages()

        const page = pages[0]

        const URL = this.BASE_URL + category + '/' + district + '-' + city
        await page.goto(URL)

        await page.waitForSelector('span.mainCountTitle')
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
     * @param {*} URL: The URL of the page to scrape that contains the links
     * @param {*} page: The page object of the browser
     * @returns: The links in the page
     * @description: Scrapes the links in a page
     */
    static linkScraper = async (URL, page) => {
        await page.goto(URL)

        await page.waitForSelector('div#SearchResults')
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
     * @param {*} category: The category of the entity
     * @param {*} district: The district of the entity
     * @param {*} city: The city of the entity
     * @param {*} pageCount: The number of pages to scrape
     * @returns: The links in A-Z order beginning from the first page
     * @description: Scrapes the links in A-Z order beginning from the first page
     */
    static linksScraperForward = async (
        category,
        district,
        city,
        pageCount
    ) => {
        const browser = await puppeteer.launch({ headless: false })
        const pages = await browser.pages()
        const page = pages[0]

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

            links = links.concat(await this.linkScraper(URL, page))
        }

        browser.close()
        return links
    }

    /**
     *
     * @param {*} category: The category of the entity
     * @param {*} district: The district of the entity
     * @param {*} city: The city of the entity
     * @param {*} pageCount: The number of pages to scrape
     * @returns: The links in Z-A order beginning from the last page
     * @description: Scrapes the links in Z-A order beginning from the last page
     */
    static linksScraperBackward = async (
        category,
        district,
        city,
        pageCount
    ) => {
        const browser = await puppeteer.launch({ headless: false })
        const pages = await browser.pages()
        const page = pages[0]

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
        const browser = await puppeteer.launch({ headless: false })
        const pages = await browser.pages()
        const page = pages[0]

        let data = []
        for (let [index, link] of links.entries()) {
            await page.goto(link)

            await new Promise((resolve) => setTimeout(resolve, 1000))
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
                            .querySelector('#CompanyNameLbl')
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
        }

        console.log(data)
        await browser.close()
        return data
    }
}

module.exports = Scraper
