const MessageCollector = require('./MessageCollector')

/**
 * Represents a Message
 */
class Message {
    /**
     * @param {Client} client The instantiating client
     * @param {string} threadID The ID of the thread
     * @param {object} data The data for the message
     */
    constructor (client, threadID, data) {
        /**
         * @type {Client}
         * The client that instantiated this
         */
        this.client = client
        /**
         * @type {string}
         * The ID of the message
         */
        this.id = data.item_id
        /**
         * @type {string}
         * The ID of the chat the message was sent in
         */
        this.chatID = threadID
        /**
         * @type {string}
         * The type of the message, either:
         * * `text` - a simple message
         * * `media` - a photo or a file
         * * `like` - a likes
         * * `voice_media` - a voice message
         */
        this.type = data.item_type === 'link' ? 'text' : data.item_type
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
         * @type {string?}
         * The content of the message
         */
        if ('text' in data) {
            this.content = data.text
        }
        if (data.item_type === 'link') {
            this.content = data.link.text
        }
        /**
         * @type {boolean}
         * Whether this message is a sticker
         */
        this.isSticker = 'is_sticker' in data ? data.is_sticker : false
        /**
         * @type {string?}
         * The URL of the photo/file sent by the user
         */
        this.mediaURL = this.type === 'media' ? data.media.image_versions2.candidates[0].url : undefined
        /**
         * @typedef {object} MessageVoiceData
         * @property {number} duration The duration (in milliseconds) of the voice message.
         * @property {string} sourceURL The URL to retrieve the file that contains the voice message.
         */
        /**
         * @type {MessageVoiceData?}
         * The data related to the voice message
         */
        this.voiceData = this.type === 'voice_media' ? {
            duration: data.voice_media.media.audio.duration,
            sourceURL: data.voice_media.media.audio.audio_src
        } : undefined

        // handle promises
        if (this.chat && this.chat._sentMessagesPromises.has(this.id)) {
            this.chat._sentMessagesPromises.get(this.id)(this)
            this.chat._sentMessagesPromises.delete(this.id)
        }

        this._patch(data)
    }

    /**
     * @type {Chat}
     * The chat the message was sent in
     */
    get chat () {
        return this.client.cache.chats.get(this.chatID)
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
         * @typedef {object} MessageLike
         *
         * @property {string} userID The user who added the like to the message
         * @property {number} timestamp The time the user added the like
         */
        /**
         * @type {MessageLike[]}
         * The likes on this message
         */
        this.likes = 'reactions' in data ? data.reactions.likes.map((r) => {
            return {
                userID: r.sender_id,
                timestamp: r.timestamp
            }
        }) : []
    }

    /**
     * Create a message collector in this chat
     * @param {MessageCollectorOptions} options The options for the collector
     * @returns {MessageCollector}
     */
    createMessageCollector (options) {
        const collector = new MessageCollector(this.chat, options)
        return collector
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
     * @returns {Promise<Message>}
     */
    reply (content) {
        return this.chat.sendMessage(`@${this.author.username}, ${content}`)
    }

    toString () {
        return this.content
    }

    toJSON () {
        return {
            client: this.client.toJSON(),
            chatID: this.chatID,
            type: this.type,
            timestamp: this.timestamp,
            authorID: this.authorID,
            content: this.content,
            mediaURL: this.mediaURL,
            voiceData: this.voiceData,
            likes: this.likes
        }
    }
}

module.exports = Message
