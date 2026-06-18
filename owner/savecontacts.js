const contactsUtil = require('../../utils/contacts');
const config = require('../../config');

module.exports = {
  name: 'savecontact',
  category: 'owner',
  description: 'Toggle automatic saving of new contact names',
  async execute(sock, msg, args) {
    const configData = contactsUtil.load();
    
    if (!args[0]) {
      return sock.sendMessage(msg.key.remoteJid, { 
        text: `📊 *Auto Contact Save:* ${configData.autoSaveContacts ? 'ON ✅' : 'OFF 🚫'}\n\nTo change this, use:\n*${config.prefix}savecontact on*\n*${config.prefix}savecontact off*` 
      });
    }

    if (args[0].toLowerCase() === 'on') {
      configData.autoSaveContacts = true;
      contactsUtil.save(configData);
      await sock.sendMessage(msg.key.remoteJid, { text: '✅ Auto contact saving is now enabled!' });
    } else if (args[0].toLowerCase() === 'off') {
      configData.autoSaveContacts = false;
      contactsUtil.save(configData);
      await sock.sendMessage(msg.key.remoteJid, { text: '🚫 Auto contact saving is now disabled!' });
    }
  }
};