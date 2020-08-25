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

module.exports = class InstaClient extends EventEmitter {
    constructor () {
        super()
        this.username = null
        this.ig = null
        this.logged = false

        this.cache = {
            messages: new Collection(),
            users: new Collection(),
            chats: new Collection(),
            pendingChats: new Collection()
        }
    }

    async fetchUser (query, cache, force) {
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

    async handleFbnsReceive (data) {
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

    async login (username, password, state) {
        const ig = withFbns(withRealtime(new IgApiClient()))
        ig.state.generateDevice(username)
        if (state) {
            await ig.importState(state)
        }
        await ig.simulate.preLoginFlow()
        const response = await ig.account.login(username, password)
        this.user = new ClientUser(this, response)
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
        this.emit('connected')
    }
}
