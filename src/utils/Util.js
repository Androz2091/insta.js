module.exports = class Util {
    static parseMessagePath (url) {
        const [ , , , threadID, , itemID ] = url.split('/')
        return {
            threadID,
            itemID
        }
    }
}
