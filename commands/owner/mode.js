/**
 * Mode Command - Toggle bot between private and public mode with progressive reactions
 */

const config = require('../../config');
const fs = require('fs');
const path = require('path');

module.exports = {
  name: 'mode',
  aliases: ['botmode', 'privatemode', 'publicmode'],
  description: 'Toggle bot between private and public mode',
  usage: '.mode <private/public>',
  category: 'owner',
  ownerOnly: true,
  
  async execute(sock, msg, args, extra) {
    const chatId = msg.key.remoteJid;
    
    // ⚙️ 5-stage progressive reaction engine
    const processingEmojis = ['⏳', '🔄', '⚙️', '✨', '⚡'];
    let isDone = false;
    let emojiIndex = 0;

    // Background animation loop sequence
    const startReactionAnimation = async () => {
      while (!isDone) {
        try {
          const currentEmoji = processingEmojis[emojiIndex % processingEmojis.length];
          await sock.sendMessage(chatId, { react: { text: currentEmoji, key: msg.key } });
          emojiIndex++;
        } catch (e) {}
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    };

    try {
      // Start processing animation immediately
      startReactionAnimation();

      const input = args[0]?.toLowerCase();

      // 🔍 Clean Status Inquiry (Just typing .mode)
      if (!input) {
        isDone = true;
        const currentMode = config.selfMode ? 'PRIVATE 🔒' : 'PUBLIC 🌐';
        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        return extra.reply(`🤖 *Bot Mode:* ${currentMode}`);
      }
      
      // 🔒 Change to Private Mode
      if (input === 'private' || input === 'priv') {
        if (config.selfMode) {
          isDone = true;
          await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
          return extra.reply('🔒 *Bot is already in PRIVATE mode.*');
        }
        
        updateConfig('selfMode', true);
        config.selfMode = true; 
        isDone = true;
        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        return extra.reply('🔒 *Bot mode updated to: PRIVATE*');
      }
      
      // 🌐 Change to Public Mode
      if (input === 'public' || input === 'pub') {
        if (!config.selfMode) {
          isDone = true;
          await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
          return extra.reply('🌐 *Bot is already in PUBLIC mode.*');
        }
        
        updateConfig('selfMode', false);
        config.selfMode = false; 
        isDone = true;
        await sock.sendMessage(chatId, { react: { text: '✅', key: msg.key } });
        return extra.reply('🌐 *Bot mode updated to: PUBLIC*');
      }
      
      // Invalid syntax handler
      isDone = true;
      return await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      
    } catch (error) {
      console.error('Mode command error:', error);
      isDone = true;
      try {
        await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } });
      } catch (e) {}
    }
  }
};

function updateConfig(key, value) {
  try {
    const configPath = path.join(__dirname, '..', '..', 'config.js');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    const regex = new RegExp(`(${key}:\\s*)(true|false)`, 'g');
    configContent = configContent.replace(regex, `$1${value}`);
    
    fs.writeFileSync(configPath, configContent, 'utf8');
    delete require.cache[require.resolve('../../config')];
  } catch (error) {
    console.error('Error saving config:', error);
  }
                                          }
