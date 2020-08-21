const { withRealtime } = require('instagram_mqtt')
const { GraphQLSubscriptions } = require('instagram_mqtt/dist/realtime/subscriptions')
const { IgApiClient } = require('instagram-private-api')
const { SkywalkerSubscriptions } = require('instagram_mqtt/dist/realtime/subscriptions')
const { EventEmitter } = require('events')
const Collection = require('@discordjs/collection')

const User = require('./User')
const ClientUser = require('./ClientUser')
const Message = require('./Message')

module.exports = class InstaClient extends EventEmitter {
    constructor () {
        super()
        this.username = null
        this.ig = null
        this.logged = false

        this.cache = {
            messages: new Collection(),
            users: new Collection()
        }
    }

    async fetchUser (userID) {
        if (!this.cache.users.has(userID)) {
            const userPayload = await this.ig.user.info(userID)
            const user = new User(this, userPayload)
            this.cache.users.set(user.id, user)
        }
        return this.cache.users.get(userID)
    }

    handleReceive (topic, payload) {
        if (topic.id === '146') {
            console.time('process')
            console.timeLog('process')
            const rawMessages = JSON.parse(payload)
            console.timeLog('process')
            rawMessages.forEach(async (rawMessage) => {
                switch (rawMessage.data[0].op) {
                case 'add': {
                    const message = new Message(this, JSON.parse(rawMessage.data[0].value))
                    console.timeLog('process')
                    await this.fetchUser(message.authorID)
                    console.timeLog('process')
                    this.cache.messages.set(message.id, message)
                    this.emit('messageCreate', message)
                    console.timeEnd('process')
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
            // ig.realtime.on('direct', logEvent('direct'));
            // ig.realtime.on('realtimeSub', logEvent('realtimeSub'));
            ig.realtime.on('error', console.error)
            ig.realtime.on('close', () => console.error('RealtimeClient closed'))

            await ig.realtime.connect({
                graphQlSubs: [
                    GraphQLSubscriptions.getAppPresenceSubscription(),
                    GraphQLSubscriptions.getZeroProvisionSubscription(ig.state.phoneId),
                    GraphQLSubscriptions.getDirectStatusSubscription(),
                    GraphQLSubscriptions.getDirectTypingSubscription(ig.state.cookieUserId),
                    GraphQLSubscriptions.getAsyncAdSubscription(ig.state.cookieUserId)
                ],
                skywalkerSubs: [
                    SkywalkerSubscriptions.directSub(ig.state.cookieUserId)
                    // SkywalkerSubscriptions.liveSub(ig.state.cookieUserId)
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
