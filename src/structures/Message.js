/**
 * Represents a Message
 */
class Message {
    /**
     * @param {InstaClient} client The instantiating client
     * @param {string} threadID The ID of the thread
     * @param {object} data The data for the message
     */
    constructor (client, threadID, data) {
        /**
         * @type {InstaClient}
         * The client that instantiated this
         */
        this.client = client
        /**
         * @type {string}
         * The ID of the chat the message was sent in
         */
        this.chatID = threadID
        this._patch(data)
    }

    /**
     * @type {Chat}
     * The chat the message was sent in
     */
    get chat () {
        return this.client.cache.chats.get(this.threadID)
    }

    /**
     * @type {User}
     * The author of the message
     */
    get author () {
        return this.client.cache.users.get(this.authorID)
    }

    _patch (data) {
        /**
         * @type {string}
         * The ID of the message
         */
        this.id = data.item_id
        /**
         * @type {string}
         * The type of the message
         */
        this.type = data.item_type
        /**
         * @type {number}
         * The timestamp the message was sent at
         */
        this.timestamp = data.timestamp
        /**
         * @type {string}
         * The ID of the user who sent the message
         */
        this.authorID = data.user_id
        /**
         * @type {string}
         * The content of the message
         */
        if ('text' in data) {
            this.content = data.text
        }
        if (this.type === 'link') {
            this.content = data.link.text
        }
    }

    /**
     * Mark the message as seen.
     * @returns {Promise<void>}
     */
    markSeen () {
        return this.chat.markMessageSeen(this.id)
    }

    /**
     * Delete the message
     * @returns {Promise<void>}
     */
    delete () {
        return this.chat.deleteMessage(this.id)
    }

    /**
     * Reply to the message
     * @param {string} content The content of the message
     * @returns {Promise<void>}
     */
    reply (content) {
        return this.chat.sendMessage(content)
    }

    toString () {
        return this.content
    }
}

module.exports = Message
