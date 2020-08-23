const Collection = require('@discordjs/collection')
const Message = require('./Message')
const User = require('./User')

module.exports = class Chat {
    constructor (client, threadID, data) {
        this.client = client
        this.id = threadID
        this.messages = new Collection()
        this.users = new Collection()
        this.leftUsers = new Collection()

        this._messagesSentPromises = new Collection()

        this._patch(data)
    }

    _patch (data) {
        this.chatIDv2 = data.thread_id_v2
        data.users.forEach((user) => {
            const exisiting = this.client.cache.users.get(user.pk)
            if (exisiting) {
                this.users.set(user.pk, exisiting)
                this.users.get(user.pk)._patch(user)
            } else {
                this.users.set(user.pk, new User(this.client, user))
                this.client.cache.users.set(user.pk, this.users.get(user.pk))
            }
        })
        data.left_users.forEach((user) => {
            const exisiting = this.client.cache.users.get(user.pk)
            if (exisiting) {
                this.leftUsers.set(user.pk, exisiting)
                this.leftUsers.get(user.pk)._patch(user)
            } else {
                this.leftUsers.set(user.pk, new User(this.client, user))
                this.client.cache.users.set(user.pk, this.leftUsers.get(user.pk))
            }
        })
        data.items.forEach((item) => {
            this.messages.set(item.item_id, new Message(this.client, this.id, item))
        })
        this.adminUserIDs = []
        this.lastActivityAt = data.last_activity_at
        this.muted = data.muted
        this.isPin = data.is_pin
        this.named = data.named
        this.pending = data.pending
        this.chatType = data.thread_type
        this.isGroup = data.is_group
    }

    get threadEntity () {
        return this.client.ig.entity.directThread(this.id)
    }

    /* markSeen (messageID) {
        return this.threadEntity.markItemSeen(messageID)
    }

    delete (messageID) {
        this.threadEntity.deleteItem(messageID).then((t) => {
            console.log('result', t)
        })
    } */

    send (content) {
        return new Promise((resolve) => {
            this.threadEntity.broadcastText(content).then(({ item_id: itemID }) => {
                resolve(this.messages.get(itemID))
            })
        })
    }
}
