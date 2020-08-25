module.exports = class Message {
    constructor (client, threadID, data) {
        this.client = client
        this.threadID = threadID
        this._patch(data)
    }

    get chat () {
        return this.client.cache.chats.get(this.threadID)
    }

    _patch (data) {
        this.id = data.item_id
        this.type = data.item_type
        this.timestamp = data.timestamp
        this.authorID = data.user_id
        if ('text' in data) {
            this.content = data.text
        }
        if (this.type === 'link') {
            this.content = data.link.text
        }
    }

    delete () {
        return this.chat.deleteMessage(this.id)
    }

    reply (content) {
        return this.chat.sendMessage(content)
    }

    markSeen () {
        return this.chat.markMessageSeen(this.id)
    }

    toString () {
        return this.content
    }
}
