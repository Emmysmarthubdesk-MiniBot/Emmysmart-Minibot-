/**
 * ViewOnce Command - Reveal view-once messages with a 5-stage looping reaction animation
 */

const { downloadContentFromMessage, jidDecode } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'viewonce',
  aliases: ['readvo', 'read', 'vv', 'readviewonce'],
  category: 'general',
  description: 'Reveal view-once messages with a dynamic 5-stage processing animation loop',
  usage: '.viewonce (reply to view-once message)',
  
  async execute(sock, msg, args) {
    const chatId = msg.key.remoteJid;
    
    // ⚙️ Configuration for the 5-stage progressive reaction engine
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
      startReactionAnimation();

      const targetInbox = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const ctx = msg.message?.extendedTextMessage?.contextInfo
        || msg.message?.imageMessage?.contextInfo
        || msg.message?.videoMessage?.contextInfo
        || msg.message?.buttonsResponseMessage?.contextInfo
        || msg.message?.listResponseMessage?.contextInfo;

      if (!ctx?.quotedMessage || !ctx?.stanzaId) {
        isDone = true;
        return await sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
      }

      const quotedMsg = ctx.quotedMessage;

      // Integrated detection logic
      const isViewOnce = !!(
        quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessageV2Extension ||
        quotedMsg.viewOnceMessage || quotedMsg.imageMessage?.viewOnce ||
        quotedMsg.videoMessage?.viewOnce || quotedMsg.audioMessage?.viewOnce
      );

      if (!isViewOnce) {
        isDone = true;
        return await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      }

      // Extraction and Buffer logic
      let actualMsg = null;
      let mtype = null;

      if (quotedMsg.viewOnceMessageV2Extension?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2Extension.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.viewOnceMessageV2?.message) {
        actualMsg = quotedMsg.viewOnceMessageV2.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.viewOnceMessage?.message) {
        actualMsg = quotedMsg.viewOnceMessage.message;
        mtype = Object.keys(actualMsg)[0];
      } else if (quotedMsg.imageMessage?.viewOnce) {
        actualMsg = { imageMessage: quotedMsg.imageMessage };
        mtype = 'imageMessage';
      } else if (quotedMsg.videoMessage?.viewOnce) {
        actualMsg = { videoMessage: quotedMsg.videoMessage };
        mtype = 'videoMessage';
      } else if (quotedMsg.audioMessage?.viewOnce) {
        actualMsg = { audioMessage: quotedMsg.audioMessage };
        mtype = 'audioMessage';
      }

      const downloadType = mtype === 'imageMessage' ? 'image' : mtype === 'videoMessage' ? 'video' : 'audio';
      const mediaStream = await downloadContentFromMessage(actualMsg[mtype], downloadType);

      let buffer = Buffer.from([]);
      for await (const chunk of mediaStream) buffer = Buffer.concat([buffer, chunk]);

      // Sender Info Parsing
      const senderJid = ctx.participant || chatId;
      const decoded = jidDecode(senderJid);
      const phoneNumber = decoded ? decoded.user : senderJid.split('@')[0];
      const senderName = msg.pushName || 'Unknown Contact';
      const originalCaption = actualMsg[mtype]?.caption || '';

      const headerCaption = `🚨 *ViewOnce Media* 🚨\n\n` +
                            `👤 *Sender:* ${senderName}\n` +
                            `📞 *Phone:* +${phoneNumber}\n\n` +
                            `${originalCaption}`.trim();

      // Final Delivery
      if (mtype === 'videoMessage') {
        await sock.sendMessage(targetInbox, { video: buffer, caption: headerCaption, mimetype: 'video/mp4' });
      } else if (mtype === 'imageMessage') {
        await sock.sendMessage(targetInbox, { image: buffer, caption: headerCaption, mimetype: 'image/jpeg' });
      } else if (mtype === 'audioMessage') {
        await sock.sendMessage(targetInbox, { audio: buffer, ptt: true, mimetype: 'audio/ogg; codecs=opus' });
        await sock.sendMessage(targetInbox, { text: headerCaption });
      }

      isDone = true;
      await sock.sendMessage(chatId, { text: '▪️', edit: msg.key });
      return await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      isDone = true;
      try { await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }); } catch (e) {}
    }
  }
};
