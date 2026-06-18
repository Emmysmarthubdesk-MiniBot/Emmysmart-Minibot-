/**
 * Video Downloader - Download video from Facebook
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl', 'fbwatch', 'fbvideo'],
  category: 'media',
  description: 'Download video from Facebook',
  usage: '.facebook <Facebook URL>',

  async execute(sock, msg, args) {
    try {
      const chatId = msg.key.remoteJid;

      // 1. Extract link from direct arguments or a replied message
      let inputStr = args.join(' ');
      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      
      if (!inputStr && quotedMsg) {
        inputStr = quotedMsg.conversation || quotedMsg.extendedTextMessage?.text || '';
      }

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matchedUrls = inputStr.match(urlRegex);
      const url = matchedUrls ? matchedUrls[0] : null;

      if (!url || (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.gg'))) {
        return await sock.sendMessage(chatId, {
          text: 'What Facebook video do you want to download?'
        }, { quoted: msg });
      }

      // 2. Alert user that download has started (Since FB links do not pass public thumbnail URLs)
      await sock.sendMessage(chatId, {
        text: `*Facebook Video*\nDownloading...`
      }, { quoted: msg });

      // 3. Query the open download API pool
      const apiUrl = `https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(url)}`;
      const response = await axios.get(apiUrl);
      
      if (!response.data || response.data.status !== 200 || !response.data.data) {
        return await sock.sendMessage(chatId, {
          text: 'Could not find the video! Please check if the link is correct and public.'
        }, { quoted: msg });
      }

      const results = response.data.data;

      // 4. Select best quality link available (HD -> SD -> First Choice)
      const videoData = results.find(v => v.quality.includes('HD')) || 
                        results.find(v => v.quality.includes('SD')) || 
                        results[0];

      if (!videoData || !videoData.url) {
        return await sock.sendMessage(chatId, {
          text: 'No downloadable streams found for this video.'
        }, { quoted: msg });
      }

      // Safely fetch bot name from config
      const botName = config.botName || config.BOT_NAME || 'the Bot';
      const videoTitle = 'Facebook Video';

      // 5. Send video directly using the download stream url
      await sock.sendMessage(chatId, {
        video: { url: videoData.url },
        mimetype: 'video/mp4',
        fileName: `facebook_download.mp4`,
        caption: `*${videoTitle}*\n\n> *_Downloaded by ${botName}_*`
      }, { quoted: msg });

    } catch (error) {
      console.error('[FACEBOOK] Command Error:', error?.message || error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: 'Download failed: ' + (error?.message || 'Unknown error')
      }, { quoted: msg });
    }
  }
};