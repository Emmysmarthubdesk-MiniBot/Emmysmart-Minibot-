const { load, save } = require('../../utils/statusview');

module.exports = {
  name: 'statusview',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const db = load();
      const opt = args[0]?.toLowerCase();

      if (opt === 'on') {
        db.enabled = true;
        save(db);
        return extra.reply('👁️ statusview enabled.');
      }

      if (opt === 'off') {
        db.enabled = false;
        save(db);
        return extra.reply('🚫 statusview disabled.');
      }

      extra.reply('📋 usage:\n• .statusview on\n• .statusview off');
    } catch (err) {
      console.error('[statusview cmd] error:', err);
      extra.reply('❌ error configuring statusview.');
    }
  }
};