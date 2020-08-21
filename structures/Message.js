module.exports = class Message {
    constructor (client, data) {
        this.client = client
        this._patch(data)
    }

    _patch (data) {
        this.id = data.item_id
        this.type = data.item_type
        this.authorID = data.user_id
        this.content = data.text
        this.timestamp = data.timestamp
    }

    get author () {
        return this.client.cache.users.get(this.authorID)
    }
}
