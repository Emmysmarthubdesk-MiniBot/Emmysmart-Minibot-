const { load, save } = require('../../utils/antidelete');

module.exports = {
  name: 'antidelete',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const db = load();
      const opt = args[0]?.toLowerCase();

      if (opt === 'on') {
        db.enabled = true;
        save(db);
        return extra.reply('✅ *Anti-Delete has been enabled.*');
      }

      if (opt === 'off') {
        db.enabled = false;
        save(db);
        return extra.reply('🚫 *Anti-Delete has been disabled.*');
      }

      // Status Inquiry styled directly into the template format
      const statusText = db.enabled ? 'ACTIVE ✅' : 'DISABLED 🚫';
      extra.reply(
        `🛡️ *Anti-Delete System*\n\n` +
        `Current Status: *${statusText}*\n\n` +
        `📋 *usage:*\n` +
        `• .antidelete on\n` +
        `• .antidelete off`
      );
    } catch (err) {
      console.error('[antidelete cmd] error:', err);
      extra.reply('❌ error configuring antidelete.');
    }
  }
};