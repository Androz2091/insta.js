const Collection = require('@discordjs/collection')

module.exports = class DirectThread {
    constructor (client, id, data) {
        this.client = client
        this.id = id
        this.messages = new Collection()
        this._patch(data)
    }

    _patch (data) {
        if ('userID' in data) {
            this.userID = data.id
        }
        if ('messages' in data) {
            data.messages.forEach((message) => {
                this.messages.set(message.id, message)
            })
        }
    }

    send (content) {
        return this.client.ig.entity.directThread([ this.id ]).broadcastText(content)
    }
}
