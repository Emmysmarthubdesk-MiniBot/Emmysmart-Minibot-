/**
 * Emmysmart Mini Bot - Shazam Universal Media Command
 * Path: commands/media/find.js
 */

const axios = require('axios');
const FormData = require('form-data');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    name: 'find',
    aliases: ['shazam', 'whatsong', 'whosong'],
    category: 'media',
    description: 'Identifies music from replied voice notes, audio files, or audio documents.',
    
    async execute(sock, msg, args) {
        const chatId = msg.key.remoteJid;

        // 1. Extract the replied message context
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quotedMsg) {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Error:* Please reply directly to a voice note, audio file, or audio document with `.find`.' 
            }, { quoted: msg });
        }

        // 2. Dynamic media routing engine
        let targetMedia = null;
        let downloadType = 'audio';

        if (quotedMsg.audioMessage || quotedMsg.pttMessage) {
            // Catches normal audio files and native voice notes
            targetMedia = quotedMsg.audioMessage || quotedMsg.pttMessage;
            downloadType = 'audio';
        } else if (quotedMsg.documentMessage && quotedMsg.documentMessage.mimetype?.startsWith('audio/')) {
            // Catches high-quality audio files sent as document attachments
            targetMedia = quotedMsg.documentMessage;
            downloadType = 'document';
        } else if (quotedMsg.videoMessage) {
            // User replied to a video file
            return await sock.sendMessage(chatId, { 
                text: '⚠️ *Video Detected:* Shazam cannot read video streams directly. Please convert the video to a voice note or audio file first!' 
            }, { quoted: msg });
        }

        // Fallback safety barrier if they reply to text/images
        if (!targetMedia) {
            return await sock.sendMessage(chatId, { 
                text: '❌ *Invalid File:* Make sure you are replying to an audio track (Voice notes, MP3s, or Audio Documents).' 
            }, { quoted: msg });
        }

        // Trigger searching reaction
        await sock.sendMessage(chatId, { react: { text: '🔍', key: msg.key } });

        try {
            // 3. Download using the calculated structural type stream
            const stream = await downloadContentFromMessage(targetMedia, downloadType);
            let audioBuffer = Buffer.from([]);
            for await (const chunk of stream) {
                audioBuffer = Buffer.concat([audioBuffer, chunk]);
            }

            const form = new FormData();
            form.append('file', audioBuffer, {
                filename: downloadType === 'document' ? (targetMedia.fileName || 'audio.mp3') : 'audio.mp3', 
                contentType: targetMedia.mimetype || 'multipart/form-data'
            });

            const options = {
                method: 'POST',
                url: 'https://shazam-core.p.rapidapi.com/v1/tracks/recognize',
                data: form,
                headers: {
                    ...form.getHeaders(),
                    // 👇 PASTE YOUR PLAIN RAPIDAPI KEY INSIDE THE QUOTES BELOW 👇
                    'x-rapidapi-key': 'b12f18bbeamsh0f0f153b56c498fp1b1f9ajsn72595b9a16c8', 
                    'x-rapidapi-host': 'shazam-core.p.rapidapi.com'
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            };

            const response = await axios.request(options);
            const result = response.data;

            if (result && result.track) {
                const songTitle = result.track.title || 'Unknown Title';
                const artistName = result.track.subtitle || 'Unknown Artist';
                const albumArt = result.track.images?.coverart || 'https://placehold.co/600x400';
                
                const responseText = 
                    `🎧 *SHAZAM AUDIO IDENTIFIER* 🎧\n` +
                    
                    `📌 *Title:* \`${songTitle}\`\n` +
                    `🎤 *Artist:* \`${artistName}\`\n\n` +
                    `> *_Downloaded by Emmysmart Mini Bot_*`;

                await sock.sendMessage(chatId, {
                    image: { url: albumArt },
                    caption: responseText
                }, { quoted: msg });

                await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

            } else {
                await sock.sendMessage(chatId, { 
                    text: '🤷‍♂️ *No Match Found:* Could not identify this specific audio snippet.' 
                }, { quoted: msg });
                await sock.sendMessage(chatId, { react: { text: '❓', key: msg.key } });
            }

        } catch (error) {
            console.error('[SHAZAM ERROR]:', error.message);
            await sock.sendMessage(chatId, { text: `❌ *Recognition system error.* Check your API request balance.` }, { quoted: msg });
            await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
        }
    }
};
