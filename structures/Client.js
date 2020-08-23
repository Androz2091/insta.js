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

module.exports = class InstaClient extends EventEmitter {
    constructor () {
        super()
        this.username = null
        this.ig = null
        this.logged = false

        this.cache = {
            messages: new Collection(),
            users: new Collection(),
            threads: new Collection()
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
        if (topic.id === '146') {
            const rawMessages = JSON.parse(payload)
            rawMessages.forEach(async (rawMessage) => {
                switch (rawMessage.data[0].op) {
                case 'add': {
                    const threadID = Util.parseAddMessageURL(rawMessage.data[0].path).threadID
                    const message = new Message(this, threadID, JSON.parse(rawMessage.data[0].value))
                    this.cache.messages.set(message.id, message)
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
            this.emit('connected')

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
        }).catch((e) => {
            throw e
        })
    }
}
