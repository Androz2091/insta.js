const { withRealtime } = require('instagram_mqtt')
// const { GraphQLSubscriptions, SkywalkerSubscriptions } = require('instagram_mqtt/dist/realtime/subscriptions')
const { IgApiClient } = require('instagram-private-api')
const { EventEmitter } = require('events')
const Collection = require('@discordjs/collection')

const Util = require('../utils/Util')

const User = require('./User')
const ClientUser = require('./ClientUser')
const Message = require('./Message')
const DirectThread = require('./DirectThread')
const Chat = require('./Chat')

module.exports = class InstaClient extends EventEmitter {
    constructor () {
        super()
        this.username = null
        this.ig = null
        this.logged = false

        this.cache = {
            messages: new Collection(),
            users: new Collection(),
            chats: new Collection()
        }
    }

    getDirectThread (threadID, data) {
        const existing = this.cache.threads.get(threadID)
        if (existing) return existing
        if (!data.messages) data.messages = []
        data.messages = [ ...data.messages, ...this.cache.messages.filter((m) => m.threadID === threadID).array() ]
        const thread = new DirectThread(this, threadID, data)
        this.cache.threads.set(threadID, thread)
        return thread
    }

    getUser (userID) {
        const existing = this.cache.users.get(userID)
        if (existing) return existing
        const user = new User(this, {
            pk: userID
        })
        this.cache.users.set(userID, user)
        return user
    }

    handleReceive (topic, payload) {
        console.log(topic, payload)

        if (topic.id === '146') {
            const rawMessages = JSON.parse(payload)
            rawMessages.forEach(async (rawMessage) => {
                // Fetch the chat where the message was sent
                const { threadID } = Util.parseMessagePath(rawMessage.data[0].path)
                const chat = this.cache.chats.get(threadID)

                // Emit right event
                switch (rawMessage.data[0].op) {
                case 'replace': {
                    // const messagePayload = JSON.parse(rawMessage.data[0].value)
                    break
                }

                case 'add': {
                    const messagePayload = JSON.parse(rawMessage.data[0].value)
                    const message = new Message(this, threadID, messagePayload)
                    chat.messages.set(message.id, message)
                    this.emit('messageCreate', message)
                    break
                }

                case 'remove': {
                    const messageID = rawMessage.data[0].value
                    const existing = this.cache.messages.get(messageID)
                    this.emit('messageDelete', existing)
                    break
                }

                default:
                    break
                }
            })
        }
    }

    login (username, password) {
        const ig = withRealtime(new IgApiClient())
        ig.state.generateDevice(username)
        ig.account.login(username, password).then(async (response) => {
            this.user = new ClientUser(this, response)

            const threads = [
                ...await ig.feed.directInbox().items(),
                ...await ig.feed.directPending().items()
            ]
            threads.forEach((thread) => {
                console.log(thread.thread_id)
                this.cache.chats.set(thread.thread_id, new Chat(this, thread.thread_id, thread))
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
        }).catch((e) => {
            throw e
        })
    }
}
