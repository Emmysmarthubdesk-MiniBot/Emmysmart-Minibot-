/**
 * YouTube Audio Downloader - Converts YouTube streams to MP3 Document
 */

const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const APIs = require('../../utils/api');
const config = require('../../config');
const { toAudio } = require('../../utils/converter');

module.exports = {
  name: 'ytaudio',
  aliases: ['yta', 'ytmp3', 'audio', 'mp3'],
  category: 'media',
  description: 'Download YouTube video converted to an MP3 file with original title',
  usage: '.audio <song name or YouTube link>',
  
  async execute(sock, msg, args) {
    try {
      const text = args.join(' ');
      const chatId = msg.key.remoteJid;
      
      if (!text) {
        return await sock.sendMessage(chatId, { 
          text: 'Usage: .audio <song name or YouTube link>' 
        }, { quoted: msg });
      }
      
      let video;
      
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        video = { url: text };
      } else {
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await sock.sendMessage(chatId, { 
            text: 'No results found.' 
          }, { quoted: msg });
        }
        video = search.videos[0];
      }
      
      // Send thumbnail preview immediately
      try {
        await sock.sendMessage(chatId, {
          image: { url: video.thumbnail },
          caption: `🎧 *Processing MP3:* *${video.title || text}*\n\nPlease wait while the audio track is fetched and converted...`
        }, { quoted: msg });
      } catch (e) {
        console.error('[AUDIO] Preview error:', e.message);
      }
      
      let audioData;
      let audioBuffer;
      let downloadSuccess = false;
      
      // Matches the exact working endpoint chain from your song file
      const apiMethods = [
        { name: 'EliteProTech', method: () => APIs.getEliteProTechDownloadByUrl(video.url) },
        { name: 'Yupra', method: () => APIs.getYupraDownloadByUrl(video.url) },
        { name: 'Okatsu', method: () => APIs.getOkatsuDownloadByUrl(video.url) },
        { name: 'Izumi', method: () => APIs.getIzumiDownloadByUrl(video.url) }
      ];
      
      for (const apiMethod of apiMethods) {
        try {
          audioData = await apiMethod.method();
          const audioUrl = audioData.download || audioData.dl || audioData.url;
          
          if (!audioUrl) continue;
          
          // Try arraybuffer request mapping
          try {
            const audioResponse = await axios.get(audioUrl, {
              responseType: 'arraybuffer',
              timeout: 90000,
              maxContentLength: Infinity,
              maxBodyLength: Infinity,
              decompress: true,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'identity'
              }
            });
            audioBuffer = Buffer.from(audioResponse.data);
            if (audioBuffer && audioBuffer.length > 0) {
              downloadSuccess = true;
              break;
            }
          } catch (downloadErr) {
            if (downloadErr.response?.status === 451) continue;
            
            // Stream response fallback mechanism
            try {
              const audioResponse = await axios.get(audioUrl, {
                responseType: 'stream',
                timeout: 90000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': '*/*',
                  'Accept-Encoding': 'identity'
                }
              });
              const chunks = [];
              await new Promise((resolve, reject) => {
                audioResponse.data.on('data', c => chunks.push(c));
                audioResponse.data.on('end', resolve);
                audioResponse.data.on('error', reject);
              });
              audioBuffer = Buffer.concat(chunks);
              if (audioBuffer && audioBuffer.length > 0) {
                downloadSuccess = true;
                break;
              }
            } catch (streamErr) {
              continue;
            }
          }
        } catch (apiErr) {
          continue;
        }
      }
      
      if (!downloadSuccess || !audioBuffer) {
        throw new Error('All download API sources failed to retrieve the data stream.');
      }

      // Check current file signatures to see if execution requires FFmpeg processing
      const firstBytes = audioBuffer.slice(0, 12);
      const hexSignature = firstBytes.toString('hex');
      const asciiSignature = firstBytes.toString('ascii', 4, 8);

      let fileExtension = 'mp3';
      if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
        fileExtension = 'm4a';
      } else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') {
        fileExtension = 'ogg';
      } else if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
        fileExtension = 'wav';
      }

      // Convert audio stream explicitly to standard MP3
      let finalBuffer = audioBuffer;
      if (fileExtension !== 'mp3') {
        try {
          finalBuffer = await toAudio(audioBuffer, fileExtension);
        } catch (convErr) {
          console.error('[AUDIO] FFmpeg Conversion fallback mismatch:', convErr.message);
        }
      }

      // Clean the YouTube title so it doesn't cause system error crashes
      const rawTitle = audioData?.title || video?.title || 'audio';
      const cleanTitle = rawTitle.replace(/[\\/:*?"<>|]/g, '').trim();
      const safeFilename = `${cleanTitle || 'YouTube_Audio'}.mp3`;

      const botName = config.botName || config.BOT_NAME || 'the Bot';

      // Send via document interface to protect the filename string from being dropped
      await sock.sendMessage(chatId, {
        document: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: safeFilename,
        caption: `*${rawTitle}*\n\n> *_Audio compiled by ${botName}_*`
      }, { quoted: msg });

      // Clean the local temporary directory files
      try {
        const tempDir = path.join(__dirname, '../../temp');
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          const now = Date.now();
          files.forEach(file => {
            const filePath = path.join(tempDir, file);
            try {
              const stats = fs.statSync(filePath);
              if (now - stats.mtimeMs > 10000) {
                if (file.endsWith('.mp3') || file.endsWith('.m4a') || /^\d+\.(mp3|m4a)$/.test(file)) {
                  fs.unlinkSync(filePath);
                }
              }
            } catch (e) {}
          });
        }
      } catch (cleanupErr) {}
      
    } catch (err) {
      console.error('Audio command handling error:', err);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `❌ Audio conversion failed: ${err.message || 'Unknown stream mapping error'}` 
      }, { quoted: msg });
    }
  }
};