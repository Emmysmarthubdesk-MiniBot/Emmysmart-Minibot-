const antidelete = require('../../utils/antidelete');

module.exports = {
  name: 'antistatus',
  category: 'owner',
  description: 'Toggle anti-delete alerts specifically for WhatsApp Statuses',
  async execute(sock, msg, args) {
    // Basic owner check logic here depending on your framework setup
    const configData = antidelete.load();
    
    if (!args[0]) {
      return reply(`📊 *Status Anti-Delete Status:* ${configData.statusEnabled ? 'ON ✅' : 'OFF ❌'}\nTo toggle, use: \x1b[1m.antideletestatus on\x1b[0m or \x1b[1m.antideletestatus off\x1b[0m`);
    }

    if (args[0].toLowerCase() === 'on') {
      configData.statusEnabled = true;
      antidelete.save(configData);
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Anti-Delete for Statuses has been enabled!' });
    } else if (args[0].toLowerCase() === 'off') {
      configData.statusEnabled = false;
      antidelete.save(configData);
      await sock.sendMessage(msg.key.remoteJid, { text: '🚫 Anti-Delete for Statuses has been disabled!' });
    }
  }
};