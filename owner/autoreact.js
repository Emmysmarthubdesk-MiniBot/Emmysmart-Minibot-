const { load, save } = require('../../utils/autoreact');

module.exports = {
  name: 'autoreact',
  aliases: ['ar'],
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const db = load();
      const opt = args[0]?.toLowerCase();

      if (opt === 'on') {
        db.enabled = true;
        save(db);
        return extra.reply('✅ *Auto-React (❤️) has been enabled.*');
      }

      if (opt === 'off') {
        db.enabled = false;
        save(db);
        return extra.reply('🚫 *Auto-React (❤️) has been disabled.*');
      }

      // Status Inquiry (triggered when typing just .autoreact or .ar)
      const statusText = db.enabled ? 'ACTIVE ✅' : 'DISABLED 🚫';
      extra.reply(
        `🤖 *Auto-React System*\n\n` +
        `Current Status: *${statusText}*\n` +
        `Target Emoji: ❤️\n\n` +
        `📋 *usage:*\n` +
        `• .autoreact on\n` +
        `• .autoreact off`
      );
    } catch (err) {
      console.error('[autoreact cmd] error:', err);
      extra.reply('❌ error configuring autoreact.');
    }
  }
};