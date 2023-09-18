const responseMessages = {
    BROWSER_INITIATED: {
        type: 'success',
        code: 'BROWSER_INITIATED',
        payload: {
            message: 'Browser initiated',
        },
    },

    BROWSER_INITIATION_FAILED: {
        type: 'error',
        code: 'BROWSER_INITIATION_FAILED',
        payload: {
            message: 'Browser initiation failed',
        },
    },

    BROWSER_CLOSED: {
        type: 'success',
        code: 'BROWSER_CLOSED',
        payload: {
            message: 'Browser closed',
        },
    },

    BROWSER_CLOSING_FAILED: {
        type: 'error',
        code: 'BROWSER_CLOSING_FAILED',
        payload: {
            message: 'Browser closing failed',
        },
    },

    RECAPTCHA_FOUND: {
        type: 'info',
        code: 'RECAPTCHA_FOUND',
        payload: {
            message: 'Recaptcha found',
        },
    },

    RECAPTCHA_SOLVED: {
        type: 'success',
        code: 'RECAPTCHA_SOLVED',
        payload: {
            message: 'Recaptcha solved',
        },
    },

    RECAPTCHA_SOLVING_FAILED: {
        type: 'error',
        code: 'RECAPTCHA_SOLVING_FAILED',
        payload: {
            message: 'Recaptcha solving failed',
        },
    },

    TOTAL_RESULTS_COUNT: {
        type: 'success',
        code: 'TOTAL_RESULTS_COUNT',
        payload: {
            message: 'Total results count',
            totalResultsCount: null,
            estimatedLoss: null,
        },
    },

    NO_RESULTS_FOUND: {
        type: 'info',
        code: 'NO_RESULTS_FOUND',
        payload: {
            message: 'No results found',
        },
    },

    INDIVIDUAL_LINKS_PAGE_SCRAPED: {
        type: 'success',
        code: 'INDIVIDUAL_LINKS_PAGE_SCRAPED',
        payload: {
            message: 'One link scraped',
        },
    },

    INDIVIDUAL_LINKS_PAGE_SCRAPING_FAILED: {
        type: 'error',
        code: 'INDIVIDUAL_LINKS_PAGE_SCRAPING_FAILED',
        payload: {
            message: 'One link scraping failed',
        },
    },

    PROXY_AUTHENTICATION_SUCCEED: {
        type: 'success',
        code: 'PROXY_AUTHENTICATION_SUCCEED',
        payload: {
            message: 'Proxy authentication succeed',
        },
    },

    PROXY_AUTHENTICATION_FAILED: {
        type: 'error',
        code: 'PROXY_AUTHENTICATION_FAILED',
        payload: {
            message: 'Proxy authentication failed',
        },
    },

    INDIVIDUAL_ENTITY_SCRAPED: {
        type: 'success',
        code: 'INDIVIDUAL_ENTITY_SCRAPED',
        payload: {
            message: 'One entity scraped',
        },
    },

    INDIVIDUAL_ENTITY_SCRAPING_FAILED: {
        type: 'error',
        code: 'INDIVIDUAL_ENTITY_SCRAPING_FAILED',
        payload: {
            message: 'One entity scraping failed',
        },
    },
}

module.exports = responseMessages
