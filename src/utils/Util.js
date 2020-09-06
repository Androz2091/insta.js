'use strict'

/**
 * Multiple static utility function
 */
class Util {
    /**
     * Parse message to return a thread ID and an item ID
     * @param {string} url The URL path to parse
     * @return {{threadID: string, itemID: string}}
     */
    static parseMessagePath (url) {
        const [ , , , threadID, , itemID ] = url.split('/')
        return {
            threadID,
            itemID
        }
    }

    /**
     * Check if query is an id
     * @param {string} query The query to checked
     * @return {boolean}
     */
    static isID (query) {
        return !isNaN(query)
    }

    /**
     * Match admin path
     * @param {string} query The query to matched
     * @param {boolean} extract If return query extracted or boolean
     * @return {string|boolean}
     */
    static matchAdminPath (query, extract) {
        const isMatched = /\/direct_v2\/threads\/(\d+)\/admin_user_ids\/(\d+)/.test(query)
        return extract ? query.match(/\/direct_v2\/threads\/(\d+)\/admin_user_ids\/(\d+)/).slice(1) : isMatched
    }

    /**
     * Match message path
     * @param {string} query The query to matched
     * @param {boolean} extract If return query extracted or boolean
     * @return {string|boolean}
     */
    static matchMessagePath (query, extract) {
        const isMatched = /\/direct_v2\/threads\/(\d+)\/items\/(\d+)/.test(query)
        return extract ? query.match(/\/direct_v2\/threads\/(\d+)\/items\/(\d+)/).slice(1) : isMatched
    }

    /**
     * Match inbox thread path
     * @param {string} query The query to matched
     * @param {boolean} extract If return query extracted or boolean
     * @return {string|boolean}
     */
    static matchInboxThreadPath (query, extract) {
        const isMatched = /\/direct_v2\/inbox\/threads\/(\d+)/.test(query)
        return extract ? query.match(/\/direct_v2\/inbox\/threads\/(\d+)/).slice(1) : isMatched
    }

    /**
     * Check if message is valid
     * @param {Message} message
     * @return {boolean}
     */
    static isMessageValid (message) {
        return ((message.timestamp / 1000) + 10000) > Date.now()
    }
}

module.exports = Util
