/**
 * Full PP Command - Updates bot profile picture without cropping
 */

module.exports = {
    name: 'fullpp',
    aliases: ['setppfull', 'uploadpp'],
    category: 'owner',
    description: 'Set bot profile picture without cropping',
    usage: 'Reply to an image with .fullpp',
    ownerOnly: true,
    
    async execute(sock, msg, args, extra) {
      try {
        // 1. Verify that the user is replying to an image
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const isImage = quotedMsg?.imageMessage || quotedMsg?.viewOnceMessageV2?.message?.imageMessage;
        
        if (!isImage) {
          return extra.reply('❌ Please reply to an image with this command.');
        }

        await extra.reply('⏳ Downloading and updating profile picture...');

        // 2. Safely download the image buffer using Baileys' native stream
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const imgMessage = quotedMsg?.viewOnceMessageV2?.message?.imageMessage || quotedMsg?.imageMessage;
        
        const stream = await downloadContentFromMessage(imgMessage, 'image');
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        // 3. Extract the clean Bot JID (removes the device/edit suffix if present)
        const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

        // 4. Upload the raw uncropped buffer directly to WhatsApp
        await sock.updateProfilePicture(botJid, buffer);
        
        await extra.reply('✅ Profile picture updated successfully without cropping!');
        
      } catch (error) {
        await extra.reply(`❌ Error updating profile picture: ${error.message}`);
      }
    }
};