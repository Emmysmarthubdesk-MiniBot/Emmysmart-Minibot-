/**
 * ViewOnce Command - Reveal view-once messages with a 5-stage looping reaction animation
 */

// Added jidDecode to safely extract clean user phone numbers
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

    // 🔄 Non-blocking background animation loop sequence
    const startReactionAnimation = async () => {
      while (!isDone) {
        try {
          const currentEmoji = processingEmojis[emojiIndex % processingEmojis.length];
          await sock.sendMessage(chatId, { 
            react: { text: currentEmoji, key: msg.key } 
          });
          emojiIndex++;
        } catch (e) {
          // Suppress background write/network log drops during animation frames
        }
        // Controls rotation speed (600ms per frame update)
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    };

    try {
      // Trigger the multi-emoji processing phase immediately
      startReactionAnimation();

      // Derive the owner's personal self-chat JID
      const targetInbox = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      // Get contextInfo from the message you replied to
      const ctx = msg.message?.extendedTextMessage?.contextInfo
        || msg.message?.imageMessage?.contextInfo
        || msg.message?.videoMessage?.contextInfo
        || msg.message?.buttonsResponseMessage?.contextInfo
        || msg.message?.listResponseMessage?.contextInfo;

      if (!ctx?.quotedMessage || !ctx?.stanzaId) {
        isDone = true; // Stop loop
        return await sock.sendMessage(chatId, { react: { text: '⚠️', key: msg.key } });
      }

      const quotedMsg = ctx.quotedMessage;

      // Verify if the quoted message contains view-once configurations
      const hasViewOnce =
        !!quotedMsg.viewOnceMessageV2 ||
        !!quotedMsg.viewOnceMessageV2Extension ||
        !!quotedMsg.viewOnceMessage ||
        !!quotedMsg.viewOnce ||
        !!quotedMsg?.imageMessage?.viewOnce ||
        !!quotedMsg?.videoMessage?.viewOnce ||
        !!quotedMsg?.audioMessage?.viewOnce;

      if (!hasViewOnce) {
        isDone = true; // Stop loop
        return await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      }

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

      if (!actualMsg || !mtype) {
        isDone = true; // Stop loop
        return await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      }

      const downloadType =
        mtype === 'imageMessage' ? 'image' : mtype === 'videoMessage' ? 'video' : 'audio';

      // Download the media stream from WhatsApp servers
      const mediaStream = await downloadContentFromMessage(actualMsg[mtype], downloadType);

      let buffer = Buffer.from([]);
      for await (const chunk of mediaStream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Safely parse out the real phone number using jidDecode
      const originalCaption = actualMsg[mtype]?.caption || '';
      const senderJid = ctx.participant || chatId;
      const decoded = jidDecode(senderJid);
      const phoneNumber = decoded ? decoded.user : senderJid.split('@')[0];
      
      // Pull the WhatsApp account display name
      const senderName = msg.pushName || 'Unknown Contact';

      // Build the clear, formatted info block
      const headerCaption = `🔓 *ViewOnce Media Extracted*\n\n` +
                            `👤 *Sender Name:* ${senderName}\n` +
                            `📞 *Phone Number:* +${phoneNumber}\n\n` +
                            `${originalCaption}`.trim();

      // Forward media directly to your personal inbox
      if (/video/.test(mtype)) {
        await sock.sendMessage(targetInbox, {
          video: buffer,
          caption: headerCaption,
          mimetype: 'video/mp4'
        });
      } else if (/image/.test(mtype)) {
        await sock.sendMessage(targetInbox, {
          image: buffer,
          caption: headerCaption,
          mimetype: 'image/jpeg'
        });
      } else if (/audio/.test(mtype)) {
        await sock.sendMessage(targetInbox, {
          audio: buffer,
          ptt: true,
          mimetype: 'audio/ogg; codecs=opus'
        });
        await sock.sendMessage(targetInbox, { 
          text: `🔓 *ViewOnce Media Extracted*\n\n👤 *Sender Name:* ${senderName}\n📞 *Phone Number:* +${phoneNumber}` 
        });
      }

      // 🏁 Success Phase: Break the loop, edit the trigger text to clear it, and add reaction
      isDone = true;

      // Overwrite the original command text with an inconspicuous marker to hide command history
      await sock.sendMessage(chatId, {
        text: '▪️',
        edit: msg.key
      });

      // Confirm with final success checkmark on the modified message
      return await sock.sendMessage(chatId, { 
        react: { text: '✅', key: msg.key } 
      });

    } catch (error) {
      console.error('Error in viewonce command:', error);
      // 🛑 Failure Phase: Break the loop and apply error marker
      isDone = true;
      try {
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      } catch (e) {}
    }
  }
};
