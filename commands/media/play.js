/**
 * YouTube Audio Downloader / Play Command
 * Structured to match ytaudio format with clean document captions.
 * Branded version: Compiled by Emmysmart Minibot
 */

const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const APIs = require('../../utils/api');
const config = require('../../config');
const { toAudio } = require('../../utils/converter');

module.exports = {
  name: 'song',
  aliases: ['play', 'music', 'songaudio'],
  category: 'media',
  description: 'Play and download studio-quality clean audio from YouTube/YouTube Music',
  usage: '.song <song name or YouTube link>',
  
  async execute(sock, msg, args) {
    try {
      const text = args.join(' ');
      const chatId = msg.key.remoteJid;
      
      if (!text) {
        return await sock.sendMessage(chatId, { 
          text: 'Usage: .song <song name or YouTube link>' 
        }, { quoted: msg });
      }
      
      let video;
      
      // Handle explicit links (including music.youtube.com domains)
      if (text.includes('youtube.com') || text.includes('youtu.be')) {
        let cleanUrl = text;
        if (text.includes('music.youtube.com')) {
          cleanUrl = text.replace('music.youtube.com', 'www.youtube.com');
        }
        video = { url: cleanUrl, title: 'Studio Audio Track', thumbnail: 'https://placehold.co/600x400' };
      } else {
        // Execute textual lookup
        const search = await yts(text);
        if (!search || !search.videos.length) {
          return await sock.sendMessage(chatId, { 
            text: 'No results found.' 
          }, { quoted: msg });
        }
        
        // YouTube Music Optimization Layer: Prioritizes clean studio album tracks
        const topResults = search.videos.slice(0, 5);
        video = topResults.find(v => 
          v.author.name.toLowerCase().includes('topic') || 
          v.title.toLowerCase().includes('official audio') ||
          v.author.name.toLowerCase().includes('vevo')
        );

        if (!video) {
          video = search.videos[0];
        }
      }
      
      // Send thumbnail preview immediately using your ytaudio status layout
      try {
        await sock.sendMessage(chatId, {
          image: { url: video.thumbnail },
          caption: `🎧 *Finding file name:* *${video.title || text}*\n\nPlease wait while the audio track is fetched and converted...`
        }, { quoted: msg });
      } catch (e) {
        console.error('[SONG] Preview error:', e.message);
      }
      
      let audioData;
      let audioBuffer;
      let downloadSuccess = false;
      
      // API fallback cluster engine
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
          console.error('[SONG] FFmpeg Conversion fallback mismatch:', convErr.message);
        }
      }

      // Clean the YouTube title using your exact character sanitizer
      const rawTitle = audioData?.title || video?.title || 'audio';
      const cleanTitle = rawTitle.replace(/[\\/:*?"<>|]/g, '').trim();
      const safeFilename = `${cleanTitle || 'YouTube_Audio'}.mp3`;

      // Send via document interface using your exact layout formatting style
      await sock.sendMessage(chatId, {
        document: finalBuffer,
        mimetype: 'audio/mpeg',
        fileName: safeFilename,
        caption: `*${rawTitle}*\n\n> *_Audio compiled by Emmysmart Minibot_*`
      }, { quoted: msg });

      // Clean the local temporary directory files synchronously to mirror ytaudio
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
      console.error('Song command handling error:', err);
      await sock.sendMessage(msg.key.remoteJid, { 
        text: `❌ Audio conversion failed: ${err.message || 'Unknown stream mapping error'}` 
      }, { quoted: msg });
    }
  }
};