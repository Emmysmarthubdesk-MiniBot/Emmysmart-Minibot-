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
  description: 'Displays a live status inquiry dashboard showing ONLY enabled automated features',
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

    // Dynamically check and append only what is turned ON
    if (contactDb.autoSaveContacts) {
      automationText += `• Auto-Save Contacts: 🟢 Enabled\n`;
      hasActiveAutomations = true;
    }
    if (onlineDb.enabled) {
      automationText += `• Always Online Simulator: 🟢 Enabled\n`;
      hasActiveAutomations = true;
    }
    if (adeb.enabled) {
      automationText += `• Chat Anti-Delete Guard: 🟢 Enabled\n`;
      hasActiveAutomations = true;
    }
    if (adeb.statusEnabled) {
      automationText += `• Status Anti-Delete Guard: 🟢 Enabled\n`;
      hasActiveAutomations = true;
    }
    if (viewDb.enabled) {
      automationText += `• Auto-View Status Engine: 🟢 Enabled\n`;
      hasActiveAutomations = true;
    }
    if (reactDb.enabled) {
      automationText += `• Auto-React Status Engine: 🟢 Enabled\n`;
      hasActiveAutomations = true;
    }
    if (autoReactDb.enabled) {
      automationText += `• Auto-React Incoming DMs: 🟢 Enabled\n`;
      hasActiveAutomations = true;
    }

    // If absolutely nothing is on, let the owner know
    if (!hasActiveAutomations) {
      dashboard += `⚠️ *All background automation systems are currently turned OFF by the owner.*\n\n`;
    } else {
      dashboard += automationText + `\n`;
    }

    dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    dashboard += `📁 *OPERATIONAL COMMANDS DIRECTORY*\n`;
    dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Dynamic filtering for the owner category list based on live database status
    let ownerCommands = [
      'antical', 'autotyping', 'block', 'botstatus', 'broadcast', 'fullpp', 
      'getpp', 'mode', 'newsletter', 'restart', 'save', 'setbotname', 
      'setbotpp', 'setmenuimage', 'setnewsletter', 'setprefix', 'unblock', 'update'
    ];

    // Only add these to the active list if their background modules are running
    if (adeb.enabled || adeb.statusEnabled) ownerCommands.push('antidelete');
    if (adeb.statusEnabled) ownerCommands.push('antistatus');
    if (autoReactDb.enabled) ownerCommands.push('autoreact');
    if (onlineDb.enabled) ownerCommands.push('online');
    if (reactDb.enabled) ownerCommands.push('statusreact');
    if (viewDb.enabled) ownerCommands.push('statusview');
    if (contactDb.autoSaveContacts) ownerCommands.push('savecontacts');

    ownerCommands.sort(); // Keep it alphabetical

    dashboard += `👑 *Owner & Config (${ownerCommands.length} Active):*\n`;
    dashboard += `_${ownerCommands.join(', ')}_\n\n`;

    dashboard += `🛡️ *Group Administration (20 Active):*\n`;
    dashboard += `_antigroupmention, antilink, antitag, autosticker, clean, delete, demote, goodbye, grouplink, groupstatus, hidetag, kick, mute, promote, resetwarn, setgoodbye, setwelcome, tagall, unmute, warn_\n\n`;

    dashboard += `📥 *Media & Downloader (9 Active):*\n`;
    dashboard += `_facebook, igs, igsc, instagram, lyrics, pinterest, song, tiktok, video_\n\n`;

    dashboard += `🎨 *Sticker & Graphics (8 Active):*\n`;
    dashboard += `_attp, crop, simage, ssweb, sticker, take, tts, viewonce_\n\n`;

    dashboard += `✨ *Text Pro & Photo Effects (18 Active):*\n`;
    dashboard += `_1917, arena, blackpink, devil, fire, glitch, hacker, ice, impressive, leaves, light, matrix, metallic, neon, purple, sand, snow, thunder_\n\n`;

    dashboard += `🛠️ *Utility & Info Tools (13 Active):*\n`;
    dashboard += `_calc, translate, weather, github, groupinfo, groupstats, list, menu, myactivity, owner, ping, qr, uptime_\n\n`;

    dashboard += `🎮 *Fun & Games (13 Active):*\n`;
    dashboard += `_bomb, complimentry, dare, flirt, gayrate, insult, joke, meme, memesearch, pies, ship, tictactoe, truth_\n\n`;

    dashboard += `🏮 *Anime & Manga Corner (9 Active):*\n`;
    dashboard += `_hneko, hwaifu, konachan, loli, megumin, milf, neko, random, waifu_\n\n`;
    
    dashboard += `━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    dashboard += `🚀 *Engine Status:* A1 Formula Active`;

    await sock.sendMessage(msg.key.remoteJid, { text: dashboard });
  }
};