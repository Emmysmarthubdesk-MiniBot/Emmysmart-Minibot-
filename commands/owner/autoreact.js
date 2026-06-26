const { load, save } = require('../../utils/autoreact');

module.exports = {
  name: 'autoreact',
  aliases: ['ar'],
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, extra) {
    try {
      const db = load();
      const input = args[0];

      // 🔍 Status Inquiry (Just typing .autoreact or .ar)
      if (!input) {
        const statusText = db.enabled ? 'ACTIVE ✅' : 'DISABLED 🚫';
        return extra.reply(`🤖 *Auto-React:* ${statusText}\n🎯 *Emoji:* ${db.emoji || '❤️'}`);
      }

      const lowerInput = input.toLowerCase();

      // 🟢 Switch On
      if (lowerInput === 'on') {
        db.enabled = true;
        save(db);
        return extra.reply(`✅ *Auto-React Enabled* [ ${db.emoji || '❤️'} ]`);
      }

      // 🔴 Switch Off
      if (lowerInput === 'off') {
        db.enabled = false;
        save(db);
        return extra.reply('🚫 *Auto-React Disabled*');
      }

      // ⚡ Direct Emoji Update (.autoreact 🔥)
      db.emoji = input;
      save(db);
      return extra.reply(`✅ *Auto-React Emoji updated to:* ${input}`);

    } catch (err) {
      console.error('[autoreact cmd] error:', err);
      extra.reply('❌ Error configuring auto-react.');
    }
  }
};
