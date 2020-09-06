'use strict'

module.exports = {
    // Client
    Client: require('./structures/Client'),
    ClientUser: require('./structures/ClientUser'),

    // Structures
    Attachment: require('./structures/Attachment'),
    Chat: require('./structures/Chat'),
    Message: require('./structures/Message'),
    MessageCollector: require('./structures/MessageCollector'),
    User: require('./structures/User'),

    // Util
    Util: require('./utils/Util')
}
