const Collection = require('@discordjs/collection')

/**
 * Represents a User
 */
class User {
    /**
     * @param {Client} client The instantiating client
     * @param {object} data The data for the user
     */
    constructor (client, data) {
        /**
         * @type {Client}
         * The client that instantiated this
         */
        this.client = client
        /**
         * @type {string}
         * The ID of the user
         */
        this.id = data.pk
        /**
         * @type {Collection<string, User>}
         * Collection of users that follow this user.
         * <info>You have to use user.fetchFollowers() to fill the collection</info>
         */
        this.followers = new Collection()
        /**
         * @type {Collection<string, User>}
         * Collection of users this user follows.
         * <info>You have to use user.fetchFollowing() to fill the collection</info>
         */
        this.following = new Collection()

        this._patch(data)
    }

    /**
     * @type {Chat}
     * Private chat between the client and the user.
     */
    get privateChat () {
        return this.client.cache.chats.find((chat) => chat.users.size === 1 && chat.users.first().id === this.id)
    }

    _patch (data) {
        /**
         * @type {string}
         * The username of the user
         */
        this.username = 'username' in data ? data.username : this.username
        /**
         * @type {string}
         * The full name of the user
         */
        this.fullName = 'full_name' in data ? data.full_name : this.fullName
        /**
         * @type {boolean}
         * Whether the user is private
         */
        this.isPrivate = 'is_private' in data ? data.is_private : this.isPrivate
        /**
         * @type {boolean}
         * Whether the user is verified
         */
        this.isVerified = 'is_verified' in data ? data.is_verified : this.isVerified
        /**
         * @type {boolean}
         * Whether the user is a business profile
         */
        this.isBusiness = 'is_business' in data ? data.is_business : this.isBusiness
        /**
         * @type {string}
         * The URL of the user's avatar
         */
        this.avatarURL = 'profile_pic_url' in data ? data.profile_pic_url : this.avatarURL
        /**
         * @type {string?}
         * The biography of the user
         */
        this.biography = 'biography' in data ? data.biography : this.biography
        /**
         * @type {number?}
         * The number of media published by the user
         */
        this.mediaCount = 'media_count' in data ? data.media_count : this.mediaCount
        /**
         * @type {number?}
         * The number of followers of the user
         */
        this.followerCount = 'follower_count' in data ? data.follower_count : this.followerCount
        /**
         * @type {number?}
         * The number of followed users by the user
         */
        this.followingCount = 'following_count' in data ? data.following_count : this.followingCount
        /**
         * @type {number?}
         * The number of videos published by IGTV
         */
        this.totalIgtvVideos = 'total_igtv_videos' in data ? data.total_igtv_videos : this.totalIgtvVideos
    }

    /**
     * Fetch the user to access all the properties
     * @returns {Promise<User>}
     */
    async fetch () {
        const user = await this.client.fetchUser(this.id, true)
        return user
    }

    /**
     * Fetch (or create) a private chat between the client and the user.
     * @returns {Promise<Chat>}
     * @example
     * // Send a message to @selenagomez
     * const user = await client.fetchUser('selenagomez');
     * // Use fetchPrivateChat() as I've never sent a message to this account
     * if(!user.privateChat) await user.fetchPrivateChat();
     * // Then I can use User#privateChat
     * user.privateChat.sendPhoto('https://picsum.photos/536/354');
     */
    async fetchPrivateChat () {
        if (this.privateChat) return this.privateChat
        const chat = await this.client.createChat([ this.id ])
        return chat
    }

    /**
     * Fetch the users that follow this user
     * @returns {Promise<Collection<string, User>>}
     */
    async fetchFollowers () {
        const followersItems = await this.client.ig.feed.accountFollowers(this.id).items()
        followersItems.forEach((user) => {
            this.followers.set(user.pk, this.client._patchOrCreateUser(user.pk, user))
        })
        return this.followers
    }

    /**
     * Fetch the users that follow this user
     * @returns {Promise<Collection<string, User>>}
     */
    async fetchFollowing () {
        const followingItem = await this.client.ig.feed.accountFollowing(this.id).items()
        followingItem.forEach((user) => {
            this.following.set(user.pk, this.client._patchOrCreateUser(user.pk, user))
        })
        return this.following
    }

    /**
     * Start following a user
     * @returns {Promise<void>}
     */
    async follow () {
        await this.client.ig.friendship.create(this.id)
    }

    /**
     * Stop following a user
     * @returns {Promise<void>}
     */
    async unfollow () {
        await this.client.ig.friendship.destroy(this.id)
    }

    /**
     * Block a user
     * @returns {Promise<void>}
     */
    async block () {
        await this.client.ig.friendship.block(this.id)
    }

    /**
     * Unblock a user
     * @returns {Promise<void>}
     */
    async unblock () {
        await this.client.ig.friendship.unblock(this.id)
    }

    /**
     * Approve follow request
     * @returns {Promise<void>}
     */
    async approveFollow () {
        await this.client.ig.friendship.approve(this.id)
    }

    /**
     * Reject follow request
     * @returns {Promise<void>}
     */
    async denyFollow () {
        await this.client.ig.friendship.deny(this.id)
    }

    /**
     * Remove the user from your followers
     * @returns {Promise<void>}
     */
    async removeFollower () {
        await this.client.ig.friendship.removeFollower(this.id)
    }

    /**
     * Send a message to the user
     * @param {string} content The content of the message to send
     * @returns {Promise<Message>}
     */
    async send (content) {
        if (!this.privateChat) await this.fetchPrivateChat()
        return await this.privateChat.send(content)
    }

    toString () {
        return this.id
    }

    toJSON () {
        return {
            client: this.client.toJSON(),
            username: this.username,
            fullName: this.fullName,
            isPrivate: this.isPrivate,
            isVerified: this.isVerified,
            isBusiness: this.isBusiness,
            avatarURL: this.avatarURL,
            biography: this.biography,
            mediaCount: this.mediaCount,
            followerCount: this.followerCount,
            followingCount: this.followingCount,
            followers: this.followers.map((u) => u.id),
            following: this.following.map((u) => u.id),
            totalIgtvVideos: this.totalIgtvVideos
        }
    }
}

module.exports = User
