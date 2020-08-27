const Collection = require('@discordjs/collection')
const Jimp = require('jimp')
const Message = require('./Message')
const User = require('./User')

/**
 * Represents a chat between one or more users.
 */
class Chat {
    /**
     * @param {InstaClient} client The instantiating client
     * @param {string} threadID The ID of the thread
     * @param {object} data The data for the chat
     */
    constructor (client, threadID, data) {
        /**
         * @type {InstaClient}
         * The client that instantiated this
         */
        this.client = client
        /**
         * @type {string}
         * The ID of the chat
         */
        this.id = threadID
        /**
         * @type {Collection<string, Message>}
         * The messages in the chat.
         */
        this.messages = new Collection()
        /**
         * @type {Collection<string, User>}
         * The users in the chat.
         */
        this.users = new Collection()
        /**
         * @type {Collection<string, User>}
         * The users that left the chat.
         */
        this.leftUsers = new Collection()

        this._sentMessagesPromises = new Collection()

        this._patch(data)
    }

    get threadEntity () {
        return this.client.ig.entity.directThread(this.id)
    }

    _patch (data) {
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
        /**
         * @type {string[]}
         * The IDs of the administrators of the chat.
         */
        this.adminUserIDs = []
        /**
         * @type {number}
         * The last time the chat was active.
         */
        this.lastActivityAt = data.last_activity_at
        /**
         * @type {boolean}
         * Whether the account has muted the chat.
         */
        this.muted = data.muted
        /**
         * @type {boolean}
         * Whether the account has pinned the chat.
         */
        this.isPin = data.is_pin
        /**
         * @type {boolean}
         * Whether this chat has a specific name (otherwise it's the default name).
         */
        this.named = data.named
        /**
         * @type {boolean}
         * Whether the chat is waiting for the account approval.
         */
        this.pending = data.pending
        /**
         * @type {boolean}
         * Whether the chat is a group.
         */
        this.isGroup = data.is_group
        /**
         * @type {boolean}
         * The type of the chat.
         */
        this.type = data.thread_type
    }

    /**
     * Approve the chat if it's pending.
     * @returns {Promise<void>}
     */
    async approve () {
        this.pending = false
        await this.client.ig.directThread.approve(this.id)
        this.client.emit('messageCreate', this.messages.first())
    }

    /**
     * Mark a message of the chat as seen
     * @param {string} messageID The ID of the message to mark as seen
     * @returns {Promise<void>}
     */
    async markMessageSeen (messageID) {
        await this.threadEntity.markItemSeen(messageID)
    }

    /**
     * Delete a message of the chat
     * @param {string} messageID The ID of the message to delete
     * @returns {Promise<void>}
     */
    async deleteMessage (messageID) {
        await this.threadEntity.deleteItem(messageID)
    }

    /**
     * Send a message in the chat
     * @param {string} content The content of the message to send
     * @returns {Promise<Message>}
     */
    sendMessage (content, options) {
        return new Promise((resolve) => {
            this.threadEntity.broadcastText(content).then(({ item_id: itemID }) => {
                this._sentMessagesPromises.set(itemID, resolve)
                if (this.messages.has(itemID)) {
                    this._sentMessagesPromises.delete(itemID)
                    resolve(this.messages.get(itemID))
                }
            })
        })
    }

    /**
     * Send a photo in the chat
     * @param {Buffer} file The photo to send
     * @returns {Promise<Message>}
     */
    sendPhoto (file) {
        return new Promise((resolve) => {
            Jimp.read(file).then((image) => {
                image.getBufferAsync(Jimp.MIME_JPEG).then((JpegBuffer) => {
                    this.threadEntity.broadcastPhoto({ file: JpegBuffer }).then(({ item_id: itemID }) => {
                        resolve(this.messages.get(itemID))
                    })
                })
            })
        })
    }
}

module.exports = Chat
