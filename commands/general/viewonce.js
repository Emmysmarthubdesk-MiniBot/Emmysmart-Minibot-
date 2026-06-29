/**
 * ViewOnce Command - Reveal view-once messages with 5-stage looping animation
 * and final success/failure reaction markers.
 */

const { downloadContentFromMessage, jidDecode } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'viewonce',
  aliases: ['readvo', 'read', 'vv', 'readviewonce'],
  category: 'general',
  description: 'Reveal view-once messages with 5-stage animation and final status reaction',
  usage: '.viewonce (reply to view-once message)',
  
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    
    // ⚙️ Progressive 5-stage animation engine
    const processingEmojis = ['⏳', '🔄', '⚙️', '✨', '⚡'];
    let isDone = false;
    let emojiIndex = 0;

    const startReactionAnimation = async () => {
      while (!isDone) {
        try {
          const currentEmoji = processingEmojis[emojiIndex % processingEmojis.length];
          await sock.sendMessage(chatId, { react: { text: currentEmoji, key: msg.key } });
          emojiIndex++;
        } catch (e) {}
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    };

    try {
      startReactionAnimation(); // Start animation loop

      const targetInbox = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const ctx = msg.message?.extendedTextMessage?.contextInfo
        || msg.message?.imageMessage?.contextInfo
        || msg.message?.videoMessage?.contextInfo;

      if (!ctx?.quotedMessage) {
        isDone = true;
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
        return;
      }

      const quotedMsg = ctx.quotedMessage;
      const isViewOnce = !!(quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension || quotedMsg.viewOnceMessage || quotedMsg.imageMessage?.viewOnce || quotedMsg.videoMessage?.viewOnce || quotedMsg.audioMessage?.viewOnce);

      if (!isViewOnce) {
        isDone = true;
        return await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      }

      // Extraction logic
      let actualMsg = null;
      let mtype = null;

      if (quotedMsg.viewOnceMessageV2Extension?.message) { actualMsg = quotedMsg.viewOnceMessageV2Extension.message; mtype = Object.keys(actualMsg)[0]; }
      else if (quotedMsg.viewOnceMessageV2?.message) { actualMsg = quotedMsg.viewOnceMessageV2.message; mtype = Object.keys(actualMsg)[0]; }
      else if (quotedMsg.viewOnceMessage?.message) { actualMsg = quotedMsg.viewOnceMessage.message; mtype = Object.keys(actualMsg)[0]; }
      else if (quotedMsg.imageMessage?.viewOnce) { actualMsg = { imageMessage: quotedMsg.imageMessage }; mtype = 'imageMessage'; }
      else if (quotedMsg.videoMessage?.viewOnce) { actualMsg = { videoMessage: quotedMsg.videoMessage }; mtype = 'videoMessage'; }
      else if (quotedMsg.audioMessage?.viewOnce) { actualMsg = { audioMessage: quotedMsg.audioMessage }; mtype = 'audioMessage'; }

      const downloadType = mtype === 'imageMessage' ? 'image' : mtype === 'videoMessage' ? 'video' : 'audio';
      const mediaStream = await downloadContentFromMessage(actualMsg[mtype], downloadType);

      let buffer = Buffer.from([]);
      for await (const chunk of mediaStream) buffer = Buffer.concat([buffer, chunk]);

      // Tagging Logic
      const senderJid = ctx.participant || chatId;
      const decoded = jidDecode(senderJid);
      const phoneNumber = decoded ? decoded.user : senderJid.split('@')[0];
      const senderName = msg.pushName || 'Unknown Contact';
      const headerCaption = `🚨 *ViewOnce Media* 🚨\n\n👤 *Sender:* @${phoneNumber}\n📞 *Phone:* +${phoneNumber}\n\n${actualMsg[mtype]?.caption || ''}`.trim();

      // Final delivery
      if (mtype === 'videoMessage') await sock.sendMessage(targetInbox, { video: buffer, caption: headerCaption, mentions: [senderJid], mimetype: 'video/mp4' });
      else if (mtype === 'imageMessage') await sock.sendMessage(targetInbox, { image: buffer, caption: headerCaption, mentions: [senderJid], mimetype: 'image/jpeg' });
      else if (mtype === 'audioMessage') {
        await sock.sendMessage(targetInbox, { audio: buffer, ptt: true, mimetype: 'audio/ogg; codecs=opus' });
        await sock.sendMessage(targetInbox, { text: headerCaption, mentions: [senderJid] });
      }

      isDone = true; // Stop animation
      await sock.sendMessage(chatId, { text: '▪️', edit: msg.key });
      return await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      isDone = true;
      await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
    }
  }
};
