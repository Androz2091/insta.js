const { withRealtime } = require('instagram_mqtt')
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
        const userPayload = await this.ig.user.info(userID)
        if (!this.cache.users.has(userID)) {
            const user = new User(this, userPayload)
            this.cache.users.set(userID, user)
        } else {
            this.cache.users.get(userID)._patch(userPayload)
        }
        return this.cache.users.get(userID)
    }

    handleReceive (topic, payload) {
        if (topic.id === '146') {
            const rawMessages = JSON.parse(payload)
            rawMessages.forEach(async (rawMessage) => {
                // Handle new pending requests
                if (!rawMessage.data[0] && rawMessage.mutation_token) {
                    const newPendingThreads = await this.ig.feed.directPending().items()
                    const chats = newPendingThreads.map((thread) => new Chat(this, thread.thread_id, thread))
                    const pendingChat = chats.find((chat) => !this.cache.pendingChats.has(chat.id))
                    this.emit('pendingRequest', pendingChat)
                    return
                }

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

    async login (username, password, state) {
        const ig = withRealtime(new IgApiClient())
        ig.state.generateDevice(username)
        if (state) {
            await ig.importState(state)
        }
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

        ig.realtime.on('receive', (topic, messages) => this.handleReceive(topic, messages))
        ig.realtime.on('error', console.error)
        ig.realtime.on('close', () => console.error('RealtimeClient closed'))

        await ig.realtime.connect({
            graphQlSubs: [
            ],
            skywalkerSubs: [
            ],
            irisData: await ig.feed.directInbox().request(),
            connectOverrides: {
            }
        })
        ig.realtime.direct.sendForegroundState({
            inForegroundApp: true,
            inForegroundDevice: true,
            keepAliveTimeout: 60
        })
        this.ig = ig
        this.emit('connected')
    }
}
