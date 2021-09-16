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
         * @type {object}
         * The full message payload instagram is sending (forwarded by the dilame/instagram-private-api)
         */
        Object.defineProperty(this, 'data', {
            value: data,
            writable: false
        })
        /**
         * @type {string}
         * The type of the message, either:
         * * `text` - a simple message
         * * `media` - a photo, a file, a GIF or a sticker
         * * `voice_media` - a voice message
         * * `story_share` - a story share message
         */
        this.type = data.item_type === 'link' ? 'text' : data.item_type === 'animated_media' ? 'media' : data.item_type
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
         * @typedef {object} StoryShareData
         * @property {User} author The user who made the story
         * @property {string} sourceURL The url of the story's image/video
         */
        /**
         * @type {StoryShareData?}
         * The data concerning the shared story
         */
        this.storyShareData = undefined
        if (data.item_type === 'story_share') {
            const msg = data.story_share.message
            if (msg === undefined || msg === 'No longer available' || msg.startsWith("This story is hidden because")) {
                this.storyShareData = {
                    author: null,
                    sourceURL: null
                }
            } else {
                this.storyShareData = {
                    author: this.client._patchOrCreateUser(data.story_share.media.user.pk, data.story_share.media.user),
                    sourceURL: data.story_share.media.image_versions2.candidates[0].url
                }
            }
        }
        /**
         * @typedef {object} MessageMediaData
         * @property {boolean} isLike Whether the media is a like (mediaData.url will be `null`)
         * @property {boolean} isAnimated Whether the media is animated
         * @property {boolean} isSticker Whether the media is a sticker
         * @property {boolean} isRandom Whether the media was chosen randomly
         * @property {string?} url The URL of the media
         */
        /**
         * @type {MessageMediaData?}
         * The data concerning the media
         */
        this.mediaData = undefined
        if (data.item_type === 'animated_media') {
            this.mediaData = {
                isLike: false,
                isAnimated: true,
                isSticker: data.animated_media.is_sticker,
                url: data.animated_media.images.fixed_height.url
            }
        } else if (data.item_type === 'like') {
            this.mediaData = {
                isLike: true,
                isAnimated: false,
                isSticker: false,
                url: null
            }
        } else if (data.item_type === 'media') {
            this.mediaData = {
                isLike: true,
                isAnimated: false,
                isSticker: false,
                url: data.media.image_versions2.candidates[0].url
            }
        }
        /**
         * @typedef {object} MessageVoiceData
         * @property {number} duration The duration (in milliseconds) of the voice message.
         * @property {string} sourceURL The URL to retrieve the file that contains the voice message.
         */
        /**
         * @type {MessageVoiceData?}
         * The data concerning the voice
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
        return this.chat.sendMessage(`${this.client.options.disableReplyPrefix ? '' : `${this.author.username}, `}${content}`)
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
            mediaData: this.mediaData,
            voiceData: this.voiceData,
            storyShareData: this.storyShareData,
            likes: this.likes
        }
    }
}

module.exports = Message
