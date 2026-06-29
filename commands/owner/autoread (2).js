// commands/owner/autoread.js
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '..', '..', 'data', 'autoread.json');

// Ensure config exists
function getConfig() {
    if (!fs.existsSync(path.dirname(configPath))) {
        fs.mkdirSync(path.dirname(configPath), { recursive: true });
    }
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({ enabled: false }, null, 2));
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

module.exports = {
    name: 'autoread',
    aliases: ['ar'],
    category: 'owner',
    ownerOnly: true,

    async execute(sock, msg, args, extra) {
        try {
            const config = getConfig();
            const input = args[0]?.toLowerCase();

            // 🔍 Status Inquiry
            if (!input || input === 'status') {
                const statusText = config.enabled ? 'ACTIVE ✅' : 'DISABLED 🚫';
                return extra.reply(`🤖 *Auto-Read:* ${statusText}`);
            }

            // 🟢 Switch On
            if (input === 'on' || input === 'enable') {
                config.enabled = true;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                return extra.reply('✅ *Auto-Read has been enabled!*');
            }

            // 🔴 Switch Off
            if (input === 'off' || input === 'disable') {
                config.enabled = false;
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
                return extra.reply('🚫 *Auto-Read has been disabled!*');
            }

            // ⚡ Usage Instruction
            return extra.reply(`*Usage:*\n.autoread on - Enable blue ticks\n.autoread off - Disable blue ticks\n.autoread status - Check current status`);

        } catch (err) {
            console.error('[autoread cmd] error:', err);
            extra.reply('❌ Error configuring auto-read.');
        }
    }
};