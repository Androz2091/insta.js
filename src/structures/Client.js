const { withRealtime, withFbns } = require('instagram_mqtt')
// const { GraphQLSubscriptions, SkywalkerSubscriptions } = require('instagram_mqtt/dist/realtime/subscriptions')
const { IgApiClient } = require('instagram-private-api')
const { EventEmitter } = require('events')
const Collection = require('@discordjs/collection')

const Util = require('../utils/Util')

const ClientUser = require('./ClientUser')
const Message = require('./Message')
const Chat = require('./Chat')
const User = require('./User')

/**
 * InstaClient, the main hub for interacting with the Instagram API.
 * @extends {EventEmitter}
 */
class InstaClient extends EventEmitter {
    constructor () {
        super()
        /**
         * @type {ClientUser}
         * The bot's user object.
         */
        this.user = null
        /**
         * @type {IgApiClient}
         * @private
         */
        this.ig = null
        /**
         * @type {boolean}
         * Whether the bot is connected and ready.
         */
        this.ready = false

        /**
         * @typedef {Object} Cache
         * @property {Collection<string, Message>} messages The bot's messages cache.
         * @property {Collection<string, User>} users The bot's users cache.
         * @property {Collection<string, Chat>} chats The bot's chats cache.
         * @property {Collection<string, Chat>} pendingChats The bot's pending chats cache.
         */
        /**
         * @type {Cache}
         * The bot's cache.
         */
        this.cache = {
            messages: new Collection(),
            users: new Collection(),
            chats: new Collection(),
            pendingChats: new Collection()
        }
    }

    /**
     * Fetch a user and cache it.
     * @param {string} query The ID or the username of the user to fetch.
     * @param {boolean} [force=false] Whether the cache should be ignored
     * @returns {User}
     */
    async fetchUser (query, force) {
        const userID = Util.isID(query) ? query : await this.ig.user.getIdByUsername(query)
        if (!this.cache.users.has(userID)) {
            const userPayload = await this.ig.user.info(userID)
            const user = new User(this, userPayload)
            this.cache.users.set(userID, user)
        } else {
            if (force) {
                const userPayload = await this.ig.user.info(userID)
                this.cache.users.get(userID)._patch(userPayload)
            }
        }
        return this.cache.users.get(userID)
    }

    /**
     * Handle Realtime messages
     * @param {object} topic
     * @param {object} payload
     * @private
     */
    handleRealtimeReceive (topic, payload) {
        if (topic.id === '146') {
            const rawMessages = JSON.parse(payload)
            rawMessages.forEach(async (rawMessage) => {
                rawMessage.data.forEach((data) => {
                    // Emit right event
                    switch (data.op) {
                    case 'replace': {
                        if (data.path.startsWith('/direct_v2/inbox/threads/')) {
                            const threadID = data.path.substr('/direct_v2/inbox/threads/'.length, data.path.length)
                            const chat = new Chat(this, threadID, JSON.parse(data.value))
                            this.cache.chats.set(chat.id, chat)
                        }
                        break
                    }

                    case 'add': {
                        // Fetch the chat where the message was sent
                        const { threadID } = Util.parseMessagePath(data.path)
                        const chat = this.cache.chats.get(threadID)
                        // Create a new message
                        const messagePayload = JSON.parse(data.value)
                        const message = new Message(this, threadID, messagePayload)
                        chat.messages.set(message.id, message)
                        this.emit('messageCreate', message)
                        break
                    }

                    case 'remove': {
                        // Fetch the chat where the message was sent
                        const { threadID } = Util.parseMessagePath(data.path)
                        const chat = this.cache.chats.get(threadID)
                        // Emit message delete event
                        const messageID = data.value
                        const existing = chat.messages.get(messageID)
                        this.emit('messageDelete', existing)
                        break
                    }

                    default:
                        break
                    }
                })
            })
        }
    }

    /**
     * Handle FBNS messages
     * @param {object} data
     * @private
     */
    async handleFbnsReceive (data) {
        console.log(data)
        if (data.pushCategory === 'new_follower') {
            const user = await this.fetchUser(data.sourceUserId)
            this.emit('newFollower', user)
        }
        if (data.pushCategory === 'private_user_follow_request') {
            const user = await this.fetchUser(data.sourceUserId)
            this.emit('followRequest', user)
        }
        if (data.pushCategory === 'direct_v2_pending') {
            if (!this.cache.pendingChats.get(data.actionParams.id)) {
                const pendingRequests = await this.ig.feed.directPending().items()
                pendingRequests.forEach((thread) => {
                    const chat = new Chat(this, thread.thread_id, thread)
                    this.cache.chats.set(thread.thread_id, chat)
                    this.cache.pendingChats.set(thread.thread_id, chat)
                })
            }
            const pendingChat = this.cache.pendingChats.get(data.actionParams.id)
            if (pendingChat) {
                this.emit('pendingRequest', pendingChat)
            }
        }
    }

    /**
     * Log the bot in to Instagram
     * @param {string} username The username of the Instagram account.
     * @param {string} password The password of the Instagram account.
     * @param {object} [state] Optional state object. It can be generated using client.ig.exportState().
     */
    async login (username, password, state) {
        const ig = withFbns(withRealtime(new IgApiClient()))
        ig.state.generateDevice(username)
        if (state) {
            await ig.importState(state)
        }
        await ig.simulate.preLoginFlow()
        const response = await ig.account.login(username, password)
        const userData = await ig.user.info(response.username)
        this.user = new ClientUser(this, {
            ...response,
            ...userData
        })
        this.emit('debug', 'logged', this.user)

        const threads = [
            ...await ig.feed.directInbox().items(),
            ...await ig.feed.directPending().items()
        ]
        threads.forEach((thread) => {
            const chat = new Chat(this, thread.thread_id, thread)
            this.cache.chats.set(thread.thread_id, chat)
            if (chat.pending) {
                this.cache.pendingChats.set(thread.thread_id, chat)
            }
        })

        ig.realtime.on('receive', (topic, messages) => this.handleRealtimeReceive(topic, messages))
        ig.realtime.on('error', console.error)
        ig.realtime.on('close', () => console.error('RealtimeClient closed'))

        await ig.realtime.connect({
            irisData: await ig.feed.directInbox().request()
        })

        ig.fbns.push$.subscribe((data) => this.handleFbnsReceive(data))

        await ig.fbns.connect({
            autoReconnect: true
        })

        this.ig = ig
        this.ready = true
        this.emit('connected')
    }
}

module.exports = InstaClient

/**
 * Emitted when a message is sent in a chat the bot is in
 * @event InstaClient#messageCreate
 * @param {Message} message The message that was sent
 * client.on('messageCreate', (message) => {
 *   if(message.content === '!ping'){
 *     message.reply('pong!');
 *   }
 * });
 */

/**
 * Emitted when a message is deleted in a chat the bot is in
 * @event InstaClient#messageDelete
 * @param {Message} message The message that was deleted
 * client.on('messageDelete', (message) => {
 *   console.log(message.id + " from @" + message.author.username + " was deleted.");
 * });
 */

/**
 * Emitted when someone starts following the bot
 * @event InstaClient#newFollower
 * @param {User} user The user that started following the bot
 * client.on('followRequest', (user) => {
 *   user.follow(); // automatically follow back
 * });
 */

/**
 * Emitted when someone wants to follow the bot
 * @event InstaClient#followRequest
 * @param {User} user The user who wants to follow the bot
 * client.on('followRequest', (user) => {
 *   user.approveFollow(); // automatically approve the request
 * });
 */

/**
 * Emitted when someone wants to send a message to the bot
 * @event InstaClient#pendingRequest
 * @param {Chat} chat The chat that needs to be approved
 * @example
 * client.on('pendingRequest', (chat) => {
 *   chat.approve(); // automatically approve the request
 * });
 */
