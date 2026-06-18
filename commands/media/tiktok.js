/**
 * Video Downloader - Download video from TikTok
 */

const axios = require('axios');
const config = require('../../config');

module.exports = {
  name: 'tiktok',
  aliases: ['tt', 'ttdl', 'tiktokdl', 'ttvideo'],
  category: 'media',
  description: 'Download video from TikTok',
  usage: '.tiktok <TikTok URL>',

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

      if (!url || !url.includes('tiktok.com')) {
        return await sock.sendMessage(chatId, {
          text: 'What TikTok video do you want to download?'
        }, { quoted: msg });
      }

      // 2. Query the public endpoint
      const apiResponse = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
      const result = apiResponse.data;

      if (result.code !== 0 || !result.data) {
        return await sock.sendMessage(chatId, {
          text: 'Could not find the video! Please make sure the link is public.'
        }, { quoted: msg });
      }

      const videoUrl = result.data.play;
      const videoTitle = result.data.title || 'TikTok Video';
      const videoThumbnail = result.data.cover;

      // 3. Send thumbnail immediately (Matches your YouTube flow)
      try {
        if (videoThumbnail) {
          await sock.sendMessage(chatId, {
            image: { url: videoThumbnail },
            caption: `*${videoTitle}*\nDownloading...`
          }, { quoted: msg });
        }
      } catch (e) {
        console.error('[TIKTOK] thumb error:', e?.message || e);
      }

      // Safely fetch bot name from config
      const botName = config.botName || config.BOT_NAME || 'the Bot';

      // 4. Send video directly using the download stream url
      await sock.sendMessage(chatId, {
        video: { url: videoUrl },
        mimetype: 'video/mp4',
        fileName: `${videoTitle.replace(/[^\w\s-]/g, '')}.mp4`,
        caption: `*${videoTitle}*\n\n> *_Downloaded by ${botName}_*`
      }, { quoted: msg });

    } catch (error) {
      console.error('[TIKTOK] Command Error:', error?.message || error);
      await sock.sendMessage(msg.key.remoteJid, {
        text: 'Download failed: ' + (error?.message || 'Unknown error')
      }, { quoted: msg });
    }
  }
};