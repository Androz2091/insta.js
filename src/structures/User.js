/**
 * Represents a User
 */
class User {
    /**
     * @param {InstaClient} client
     * @param {object} data
     */
    constructor (client, data) {
        /**
         * @type {InstaClient}
         * The client that instantiated this
         */
        this.client = client
        this._patch(data)
    }

    get privateChat () {
        return this.client.cache.chats.find((chat) => chat.users.size === 1 && chat.users[0].id === this.id)
    }

    _patch (data) {
        this.id = data.pk
        this.username = data.username
        this.fullName = data.full_name
        this.isPrivate = data.is_private
        this.profilePictureURL = data.profile_pic_url
        this.profilePictureID = data.profile_pic_id
        this.isVerified = data.is_verified
        this.hasAnonymousProfilePicture = data.has_anonymous_profile_picture
        this.canBoostPost = data.can_boost_post
        this.isBusiness = data.is_business
        this.accountType = data.account_type
        this.professionalConversionSuggestedAccountType = data.professional_conversion_suggested_account_type
        this.isCallToActionEnabled = data.is_call_to_action_enabled
        this.canSeeOrganicInsights = data.can_see_organic_insights
        this.showInsightsTerms = data.show_insights_terms
        this.totalIGTVVideos = data.total_igtv_videos
        this.reelAutoArchive = data.reel_auto_archive
        this.hasPlacedOrders = data.has_placed_orders
        this.allowedCommenterType = data.allowed_commenter_type
        this.nametag = data.nametag
        this.isUsingUnifiedInboxForDirect = data.is_using_unified_inbox_for_direct
        this.interopMessagingUserFbid = data.interop_messaging_user_fbid
        this.canSeePrimaryCountryInSettings = data.can_see_primary_country_in_settings
        this.accountBadges = data.account_badges
        this.allowContactsSync = data.allow_contacts_sync
        this.phoneNumber = data.phone_number
        this.media_count = data.media_count
        this.follower_count = data.follower_count
        this.following_count = data.following_count
        this.following_tag_count = data.following_tag_count
        this.biography = data.biography
        this.can_link_entities_in_bio = data.can_link_entities_in_bio
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
    send (content) {
        return this.privateChat.send(content)
    }

    toString () {
        return this.id
    }
}

module.exports = User
