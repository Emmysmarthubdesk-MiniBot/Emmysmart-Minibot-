const antidelete = require('../../utils/antidelete');
const contactsUtil = require('../../utils/contacts');
const statusview = require('../../utils/statusview');
const statusreact = require('../../utils/statusreact');
const autoreact = require('../../utils/autoreact');
const online = require('../../utils/online');

module.exports = {
  name: 'botstatus',
  aliases: ['statusinquiry', 'activefeatures', 'dashboard'],
  category: 'owner',
  description: 'Displays a clean dashboard showing only active automations and their corresponding control commands',
  async execute(sock, msg, args) {
    // 1. Load Live Database Toggles
    const adeb = antidelete.load();
    const contactDb = contactsUtil.load();
    const viewDb = statusview.load();
    const reactDb = statusreact.load();
    const autoReactDb = autoreact.load();
    const onlineDb = online.load();

    let dashboard = `⚙️ *ACTIVE SYSTEM DASHBOARD* ⚙️\n`;
    dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    let hasActiveAutomations = false;
    let automationText = `👤 *ACTIVE AUTOMATIONS:*\n`;

    // Dynamically check and append only what is turned ON along with its command wrapped in bold asterisks
    if (contactDb.autoSaveContacts) {
      automationText += `• *Auto-Save Contacts*: 🟢 Enabled \`[ .savecontacts ]\`\n`;
      hasActiveAutomations = true;
    }
    if (onlineDb.enabled) {
      automationText += `• *Always Online Simulator*: 🟢 Enabled \`[ .online ]\`\n`;
      hasActiveAutomations = true;
    }
    if (adeb.enabled) {
      automationText += `• *Chat Anti-Delete Guard*: 🟢 Enabled \`[ .antidelete ]\`\n`;
      hasActiveAutomations = true;
    }
    if (adeb.statusEnabled) {
      automationText += `• *Status Anti-Delete Guard*: 🟢 Enabled \`[ .antistatus ]\`\n`;
      hasActiveAutomations = true;
    }
    if (viewDb.enabled) {
      automationText += `• *Auto-View Status Engine*: 🟢 Enabled \`[ .statusview ]\`\n`;
      hasActiveAutomations = true;
    }
    if (reactDb.enabled) {
      automationText += `• *Auto-React Status Engine*: 🟢 Enabled \`[ .statusreact ]\`\n`;
      hasActiveAutomations = true;
    }
    if (autoReactDb.enabled) {
      automationText += `• *Auto-React Incoming DMs*: 🟢 Enabled \`[ .autoreact ]\`\n`;
      hasActiveAutomations = true;
    }

    // Include the status command itself if everything else is off
    automationText += `• *Status Dashboard*: 🟢 Enabled \`[ .botstatus ]\`\n`;

    dashboard += automationText;
    dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━`;

    await sock.sendMessage(msg.key.remoteJid, { text: dashboard });
  }
};
