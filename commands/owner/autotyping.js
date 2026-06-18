const { load, save } = require('../../utils/autotyping');

module.exports = {
  name: 'autotyping',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const db = load();
      const opt = args[0]?.toLowerCase();

      // 1. Status Inquiry Logic (A1 Formula)
      if (!opt) {
        const status = db.enabled ? '✅ enabled' : '🚫 disabled';
        return extra.reply(`📋 *autotyping Indicator Status:* ${status}\n\n*Usage:*\n• .autotyping on\n• .autotyping off`);
      }

      // 2. Toggle Logic
      if (opt === 'on') {
        db.enabled = true;
        save(db);
        return extra.reply('✅ autotyping simulation enabled.');
      }

      if (opt === 'off') {
        db.enabled = false;
        save(db);
        return extra.reply('🚫 autotyping simulation disabled.');
      }
    } catch (err) {
      console.error('[typing cmd] error:', err);
      extra.reply('❌ error configuring typing mode.');
    }
  }
};