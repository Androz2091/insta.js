module.exports = class Util {
    static parseMessagePath (url) {
        const [ , , , threadID, , itemID ] = url.split('/')
        return {
            threadID,
            itemID
        }
    }

    static isID (query) {
        return !isNaN(query)
    }

    static matchAdminPath (query, extract) {
        const isMatched = /\/direct_v2\/threads\/(\d+)\/admin_user_ids\/(\d+)/.test(query)
        return extract ? query.match(/\/direct_v2\/threads\/(\d+)\/admin_user_ids\/(\d+)/).slice(1) : isMatched
    }

    static matchMessagePath (query, extract) {
        const isMatched = /\/direct_v2\/threads\/(\d+)\/items\/(\d+)/.test(query)
        return extract ? query.match(/\/direct_v2\/threads\/(\d+)\/items\/(\d+)/).slice(1) : isMatched
    }

    static matchInboxThreadPath (query, extract) {
        const isMatched = /\/direct_v2\/inbox\/threads\/(\d+)/.test(query)
        return extract ? query.match(/\/direct_v2\/inbox\/threads\/(\d+)/).slice(1) : isMatched
    }
}
