const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
  name: 'save',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    // Fallback if your extra object doesn't pass a custom react helper
    const react = extra?.react || (async (emoji) => {
      await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
    });

    try {
      // 1. Get the context of the replied-to message/status
      const quotedContext = msg.message?.extendedTextMessage?.contextInfo;
      const quotedMessage = quotedContext?.quotedMessage;

      // NEW CHECK: If no reply exists, OR if the reply isn't from a status broadcast
      if (!quotedMessage || quotedContext?.remoteJid !== 'status@broadcast') {
        await react('❌');
        return await sock.sendMessage(msg.key.remoteJid, { 
          text: '👉 *This command is only meant for saving statuses! Please reply directly to a status update.*' 
        }, { quoted: msg });
      }

      // 2. Identify the media type inside the reply
      let mediaType = null;
      let mediaKey = null;

      if (quotedMessage.imageMessage) {
        mediaType = 'image';
        mediaKey = quotedMessage.imageMessage;
      } else if (quotedMessage.videoMessage) {
        mediaType = 'video';
        mediaKey = quotedMessage.videoMessage;
      } else if (quotedMessage.documentMessage) {
        mediaType = 'document';
        mediaKey = quotedMessage.documentMessage;
      }

      // 3. Extract the caption (handles media captions or text-only statuses)
      const caption = mediaKey?.caption || 
                      quotedMessage.extendedTextMessage?.text || 
                      quotedMessage.conversation || 
                      "";

      await react('⏳');

      // 4. Safely construct your personal JID (strips out multi-device suffixes if present)
      const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      // 5. If it's a media status, download and send it
      if (mediaKey) {
        const stream = await downloadContentFromMessage(mediaKey, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        await sock.sendMessage(myJid, {
          [mediaType]: buffer,
          caption: `*Saved Status Context*\n\n*Caption:* ${caption}`,
          mimetype: mediaKey.mimetype
        });
        
      } else if (caption) {
        // 6. If it's a text-only status, just forward the text
        await sock.sendMessage(myJid, {
          text: `*Saved Text Status*\n\n${caption}`
        });
      } else {
        // Nothing tangible to save
        return await react('❌');
      }

      // 7. Success reaction in the recipient's chat
      await react('✅');

    } catch (err) {
      console.error('Status Saver Error:', err);
      await react('❌');
    }
  }
};