'use strict'

/**
 * A bot that extracts data from a media_share (post).
 * Whenever the bot receives a media_share, it extracts:
 * - `senderIgHandle` <string> (instagram handle) of the sender of the message
 *
 * REMEMBER: the following data is only extracted when a media_share was send, any other message is ignored
 * - `creatorIgHandle` <string> (instagram handle) of the creator of the shared post (NOT neccessarely the sender of the message)
 * - `images` <array<string>> of picture urls (extracts all images if a carousel is sent)
 * - `mediaShareUrl` <string> public link to the shared post
 * - `timestamp` <number> unix timestamp when the media_share was posted (this is not the timestamp of the message)
 * - `location` <object> with location information (if the post has a geotag), undefined if no geotag found
 * - `location.coordinates` <object>{lng: Number, lat: Number} coordinates of the location where the post was taken
 * - `location.address` <string> address of the location where the post was taken
 * - `location.name` <string> name of the geolocation of the post
 * - `location.shortName` <string> shortName of the geolocation of the post
 * - `location.city` <string> city of the geolocation of the post
 */

// Import the insta.js module
const Insta = require('@androz2091/insta.js')

// Create an instance of a Instagram client
const client = new Insta.Client()

/**
 * The connected event is vital, it means that only _after_ this will your bot start reacting to information
 * received from Instagram
 */
client.on('connected', () => {
  console.log('I am ready!')
})

// Create an event listener for all messages
// (this eventlistener gets triggered when you either receive or send a message)
client.on('messageCreate', message => {
  // only process messages that
  // - are media shares
  // - are not send by the logged in user (only received messages, not sent messages)
  const isMediaShare = message.data.item_type === 'media_share'
  const isReceivedMessage = message.authorID !== client.user.id
  if (isMediaShare && isReceivedMessage) {
    // extract media share data
    const extractedData = {
      messageSender: message.author.username,
      creatorIgHandle: extractCreator(message.data),
      images: extractImages(message.data),
      mediaShareUrl: extractMediaShareUrl(message.data),
      timestamp: extractPostTimestamp(message.data),
      location: extractLocation(message.data),
    }
    // display extracted metadata
    console.log(extractedData)
  }
})

// Log our bot in using Instagram credentials
client.login('your instagram username', 'your instagram password')


/*
 * helper functions
 */
function extractCreator(messageData) {
  try {
    return messageData.media_share.user.username
  } catch (err) {
    console.log(err)
    return undefined
  }
}
function extractImages(messageData) {
  let images = []
  const postImage = extracteImageFromSinglePost(messageData)
  if (postImage) {
    images.push(postImage)
  }
  const carouselImages = extractImagesFromCarousel(messageData)
  if (carouselImages) {
    images = images.concat(carouselImages)
  }
  return images
}
function extractMediaShareUrl(messageData) {
  try {
    return `https://www.instagram.com/p/${messageData.media_share.code}`
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extracteImageFromSinglePost(messageData) {
  try {
    return messageData.media_share.image_versions2.candidates[0].url
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extractImagesFromCarousel(messageData) {
  try {
    return messageData.media_share.carousel_media.map(mediaObj => mediaObj.image_versions2.candidates[0].url)
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extractPostTimestamp(messageData) {
  try {
    return messageData.media_share.taken_at
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extractLocation(messageData) {
  const location = {
    coordinates: extractLocationCoordinates(messageData),
    address: extractLocationAddress(messageData),
    city: extractLocationCity(messageData),
    name: extractLocationName(messageData),
    shortName: extractLocationShortName(messageData),
  }
  if (!location.coordinates && !location.address && !location.city && !location.name && !location.shortName) {
    return undefined
  }
  return location
}
function extractLocationCoordinates(messageData) {
  try {
    return {
      lat: messageData.media_share.lat || messageData.media_share.location.lat,
      lng: messageData.media_share.lng || messageData.media_share.location.lng,
    }
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extractLocationAddress(messageData) {
  try {
    return messageData.media_share.location.address
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extractLocationCity(messageData) {
  try {
    return messageData.media_share.location.city
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extractLocationName(messageData) {
  try {
    return messageData.media_share.location.name
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
function extractLocationShortName(messageData) {
  try {
    return messageData.media_share.location.short_name
  } catch (err) {
    // console.log(err)
    return undefined
  }
}
