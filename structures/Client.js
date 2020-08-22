const { withRealtime } = require('instagram_mqtt')
const { GraphQLSubscriptions, SkywalkerSubscriptions } = require('instagram_mqtt/dist/realtime/subscriptions')
const { IgApiClient } = require('instagram-private-api')
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

    async fetchUserInfos (userID) {
        const user = await this.ig.user.info(userID)
        this.cache.users.get(user.pk)._patch(user)
    }

    async fetchUser (userID, needFetch) {
        const user = this.cache.users.get(userID) || new User(this, { pk: userID })
        if (!user.fetchPromise) user.fetchPromise = this.fetchUserInfos(userID)
        if (!this.cache.users.has(userID)) this.cache.users.set(userID, user)
        if (needFetch) await user.fetchPromise
        return user
    }

    handleReceive (topic, payload) {
        if (topic.id === '146') {
            const rawMessages = JSON.parse(payload)
            rawMessages.forEach(async (rawMessage) => {
                switch (rawMessage.data[0].op) {
                case 'add': {
                    const message = new Message(this, JSON.parse(rawMessage.data[0].value))
                    await this.fetchUser(message.authorID, false)
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
