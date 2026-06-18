/**
 * Global Configuration for WhatsApp MD Bot
 */

module.exports = {
    // 🛡️ BINARY PHASE LINE
    activationCode: 'EMMY-24HOURS', // DO NOT EDIT THIS LINE
    adminNumber: '2348107106127',    // Your Admin WhatsApp number for renewals

    // Bot Owner Configuration
    ownerNumber: [''], // Add your number without + or spaces
    ownerName: [''], // Owner names corresponding to ownerNumber array
    
    // Bot Configuration
    botName: 'Emmysmart Mini Bot',
    prefix: '.',
    sessionName: 'session',
    sessionID: process.env.SESSION_ID || '',
    newsletterJid: '120363410039942242@newsletter', // Newsletter JID for menu forwarding
    updateZipUrl: 'https://github.com/Emmysmarthubdesk-MiniBot/Emmysmart-Minibot-/archive/refs/heads/main.zip', // URL to latest code zip for .update command
    
    // Sticker Configuration
    packname: 'Emmysmart Bot Mini',
    
    // Bot Behavior
    selfMode: false, // Private mode - only owner can use commands
    autoRead: false,
    autoTyping: false,
    autoBio: false,
    autoSticker: false,
    autoReact: false,
    autoReactMode: 'bot', // set bot or all via cmd
    autoDownload: false,
    
    // Group Settings Defaults
    defaultGroupSettings: {
        antilink: false,
        antilinkAction: 'delete', // 'delete', 'kick', 'warn'
        antitag: false,
        antitagAction: 'delete',
        antiall: false, // Owner only - blocks all messages from non-admins
        antiviewonce: false,
        antibot: false,
        anticall: false, // Anti-call feature
        antigroupmention: false, // Anti-group mention feature
        antigroupmentionAction: 'delete', // 'delete', 'kick'
        welcome: false,
        welcomeMessage: '╭╼━≪•𝙽𝙴𝚆 𝙼𝙴𝙼𝙱𝙴𝚁•≫━╾╮\n┃𝚆𝙴𝙻𝙲𝙾𝙼𝙴: @user 👋\n┃Member count: #memberCount\n┃𝚃𝙸𝙼𝙴: time⏰\n╰━━━━━━━━━━━━━━━╯\n\n*@user* Welcome to *@group*! 🎉\n*Group 𝙳𝙴𝚂𝙲𝚁𝙸𝙿𝚃𝙸𝙾𝙽*\ngroupDesc\n\n> *ᴘᴏᴡᴇʀᴇ动 ʙʏ botName*',
        goodbye: false,
        goodbyeMessage: 'Goodbye @user 👋 We will never miss you!',
        antiSpam: false,
        antidelete: false,
        nsfw: false,
        detect: false,
        chatbot: false,
        autosticker: false // Auto-convert images/videos to stickers
    },
    
    // API Keys (add your own)
    apiKeys: {
        openai: '',
        deepai: '',
        remove_bg: ''
    },
    
    // Message Configuration
    messages: {
        wait: '⏳ Please wait...',
        success: '✅ Success!',
        error: '❌ Error occurred!',
        ownerOnly: '👑 This command is only for bot owner!',
        adminOnly: '🛡️ This command is only for group admins!',
        groupOnly: '👥 This command can only be used in groups!',
        privateOnly: '💬 This command can only be used in private chat!',
        botAdminNeeded: '🤖 Bot needs to be admin to execute this command!',
        invalidCommand: '❓ Invalid command! Type .menu for help'
    },
    
    // Timezone
    timezone: 'Asia/Kolkata',
    
    // Limits
    maxWarnings: 3,
    
    // Social Links (optional)
    social: {
        github: 'https://github.com/Emmysmarthubdesk-MiniBot',
        whatsapp: 'https://wa.me/message/GUUF5WRX6P2LN1',
        channel: 'https://whatsapp.com/channel/0029Vb7YdxUCnA7v7rZEFl12'
    }
};
