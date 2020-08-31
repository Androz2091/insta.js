const { EventEmitter } = require('events')

/**
 * Collects messages in a chat
 * @extends {EventEmitter}
 */
class MessageCollector extends EventEmitter {
    /**
     * @typedef {object} MessageCollectorOptions
     * @property {Function} filter The filter to apply
     * @property {number} idle How long to stop the collector after inactivity in milliseconds
     */
    /**
     * @param {Chat} chat The chat in which the messages should be collected
     * @param {MessageCollectorOptions} options The options for the collector
     */
    constructor (chat, { filter, idle }) {
        super()
        /**
         * @type {Client}
         * The client that instantiated this
         */
        this.client = chat.client
        /**
         * @type {Chat}
         * The chat in which the messages should be collected
         */
        this.chat = chat
        /**
         * @type {Function}
         * The filter to apply
         */
        this.filter = filter || (() => true)
        /**
         * @type {number}
         * How long to stop the collector after inactivity in milliseconds
         */
        this.idle = idle || 10000
        if (idle) this._idleTimeout = setTimeout(() => this.end('idle'), this.idle)

        /**
         * @type {boolean}
         * Whether this collector is ended
         */
        this.ended = false

        this.handleMessage = this.handleMessage.bind(this)
        this.client.on('messageCreate', this.handleMessage)
    }

    async handleMessage (message) {
        if (this.ended) return
        const valid = await this.filter(message) && message.chatID === this.chat.id
        if (valid) {
            this.emit('message', message)

            if (this._idleTimeout && !this.ended) {
                clearTimeout(this._idleTimeout)
                this._idleTimeout = setTimeout(() => this.end('idle'), this.idle)
            }
        }
    }

    /**
     * End the collector
     * @param {string} reason The reason the collector ended
     */
    async end (reason) {
        this.ended = true
        if (this._idleTimeout) {
            clearTimeout(this._idleTimeout)
        }
        this.client.removeListener('messageCreate', this.handleMessage)
        this.emit('end', reason)
    }

    toJSON () {
        return {
            client: this.client.toJSON(),
            chatID: this.chat.id,
            ended: this.ended
        }
    }
}

module.exports = MessageCollector

/**
 * Emitted when a message is collected by the collector
 * @event MessageCollector#message
 * @param {Message} message The collected message
 */

/**
 * Emitted when the collector ends
 * @event MessageCollector#end
 * @param {Message} reason The reason the collector ended
 */
