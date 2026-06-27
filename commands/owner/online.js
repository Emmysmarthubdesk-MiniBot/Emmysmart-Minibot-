const { load, save } = require('../../utils/online');

module.exports = {
  name: 'online',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const db = load();
      const opt = args[0]?.toLowerCase();

      if (opt === 'on') {
        db.enabled = true;
        save(db);
        // Explicitly set to 'available' to ensure the state updates on the server
        await sock.sendPresenceUpdate('available'); 
        return extra.reply('✅ online mode enabled.');
      }

      if (opt === 'off') {
        db.enabled = false;
        save(db);
        // Setting to 'unavailable' stops the bot from broadcasting active presence
        await sock.sendPresenceUpdate('unavailable');
        return extra.reply('🚫 online mode disabled. The bot will remain invisible.');
      }

      // Show current status if no argument provided
      const status = db.enabled ? '✅ enabled' : '🚫 disabled';
      extra.reply(`📋 *Online Mode Status:* ${status}\n\n*Usage:*\n• .online on\n• .online off`);
    } catch (err) {
      console.error('[online cmd] error:', err);
      extra.reply('❌ error configuring online mode.');
    }
  }
};
