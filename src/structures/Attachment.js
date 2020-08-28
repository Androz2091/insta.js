const fetch = require('node-fetch')
const fs = require('fs')
const Jimp = require('jimp')

class Attachment {
    /**
     * Creates an attachment for insta.js
     * @param {string|Buffer} data Attachment data
     */
    constructor (data) {
        /**
         * Attachment data
         */
        this.data = data
        /**
         * Attachment file
         */
        this.file = null
    }

    _verify () {
        if (!this.data) throw new Error('Can not create empty attachment!')
        if (Buffer.isBuffer(this.data)) return this._handleBuffer(this.data)
        if (typeof this.data === 'string' && this.data.startsWith('https://')) return this._handleURL(this.data)
        else if (typeof this.data === 'string') return this._handleFile(this.data)
        throw new Error('Unsupported attachment.')
    }

    async _handleFile (file) {
        if (!fs.existsSync(file)) throw new Error('Couldn\'t resolve the file.')
        const fileStream = fs.readFileSync(file)
        if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
            this.file = fileStream
            return
        }
        return this._handleBuffer(fileStream)
    }

    async _handleBuffer (data) {
        const image = await Jimp.read(data)
        this.file = await image.getBufferAsync(Jimp.MIME_JPEG)
    }

    async _handleURL (link) {
        if (!link || typeof link !== 'string') throw new Error('URL must be a string.')
        const res = await fetch(link)
        return this._handleBuffer(await res.buffer())
    }
}

module.exports = Attachment
