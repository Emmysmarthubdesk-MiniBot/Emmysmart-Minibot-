const { load, save } = require('../../utils/statusreact');

module.exports = {
  name: 'statusreact',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const db = load();
      const opt = args[0]?.toLowerCase();

      if (opt === 'on') {
        db.enabled = true;
        save(db);
        return extra.reply('✅ statusreact enabled.');
      }

      if (opt === 'off') {
        db.enabled = false;
        save(db);
        return extra.reply('🚫 statusreact disabled.');
      }

      extra.reply('📋 usage:\n• .statusreact on\n• .statusreact off');
    } catch (err) {
      console.error('[statusreact cmd] error:', err);
      extra.reply('❌ error configuring statusreact.');
    }
  }
};