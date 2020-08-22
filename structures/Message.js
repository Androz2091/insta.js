module.exports = class Message {
    constructor (client, threadID, data) {
        this.client = client
        this.threadID = threadID
        this.client.getDirectThread(this.threadID, {
            userID: data.user_id
        })
        this._patch(data)
    }

    _patch (data) {
        this.id = data.item_id
        this.type = data.item_type
        this.authorID = data.user_id
        this.content = data.text
        this.timestamp = data.timestamp
    }

    get thread () {
        return this.client.getDirectThread(this.threadID, {
            userID: this.authorID
        })
    }

    get author () {
        return this.client.getUser(this.authorID)
    }

    async markSeen () {
        await this.client.ig.directThread.markItemSeen(this.threadID, this.id)
    }
}
