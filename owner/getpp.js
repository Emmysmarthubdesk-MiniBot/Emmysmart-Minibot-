const config = require('../../config');

module.exports = {
  name: 'getpp',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const { from, sender, react } = extra;
      
      // Determine the target: Mentioned user or the sender
      const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
      
      let ppUrl;
      try {
        ppUrl = await sock.profilePictureUrl(target, 'image');
      } catch (e) {
        return react('❌'); // Reaction if no picture found
      }

      // Identify your private owner JID
      const ownerJid = config.ownerNumber[0].includes('@') 
        ? config.ownerNumber[0] 
        : `${config.ownerNumber[0]}@s.whatsapp.net`;

      // 1. Send the image to your private chat with the requested caption
      await sock.sendMessage(ownerJid, { 
        image: { url: ppUrl }, 
        caption: '📸 Profile picture retrieved' 
      });

      // 2. React to the command in the original chat to confirm it was sent
      await react('✅');

    } catch (err) {
      console.error('[getpp cmd] error:', err);
      extra.react('❌'); // Reaction on error
    }
  }
};