module.exports = class Util {
    static parseAddMessageURL (url) {
        const [ , , , threadID, , itemID ] = url.split('/')
        return {
            threadID,
            itemID
        }
    }
}
