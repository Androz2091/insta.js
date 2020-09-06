const fetch = require('node-fetch')
const fs = require('fs')
const Jimp = require('jimp')

/**
 * Create an attachment for insta.js
 */
class Attachment {
    /**
     * @param {string|Buffer} data Attachment data
     */
    constructor (data) {
        /**
         * @type {string|Buffer}
         * Attachment data
         */
        this.data = data
        /**
         * @type {Buffer}
         * Attachment file
         */
        this.file = null
    }

    /**
     * Verify the attachment and generate the file buffer
     * @private
     * @return {Promise<void>}
     */
    _verify () {
        if (!this.data) throw new Error('Can not create empty attachment!')
        if (Buffer.isBuffer(this.data)) return this._handleBuffer(this.data)
        if (typeof this.data === 'string' && /http(s)?:\/\//.test(this.data)) return this._handleURL(this.data)
        else if (typeof this.data === 'string') return this._handleFile(this.data)
        throw new Error('Unsupported attachment.')
    }

    /**
     * File handler
     * @param {string} file Image path
     * @return {Promise<void>}
     */
    async _handleFile (file) {
        if (!fs.existsSync(file)) throw new Error('Couldn\'t resolve the file.')
        const fileStream = fs.readFileSync(file)
        if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            this.file = fileStream
            return
        }
        return this._handleBuffer(fileStream)
    }

    /**
     * Buffer handler
     * @param {Buffer} data Image buffer
     * @return {Promise<void>}
     */
    async _handleBuffer (data) {
        const image = await Jimp.read(data)
        this.file = await image.getBufferAsync(Jimp.MIME_JPEG)
    }

    /**
     * URL handler
     * @param {string} link Image url
     * @return {Promise<void>}
     */
    async _handleURL (link) {
        if (!link || typeof link !== 'string') throw new Error('URL must be a string.')
        const res = await fetch(link)
        return this._handleBuffer(await res.buffer())
    }
}

module.exports = Attachment
