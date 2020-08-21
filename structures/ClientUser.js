const User = require('./User')

module.exports = class ClientUser extends User {
    constructor (client, data) {
        super(client, data)
    }
}
