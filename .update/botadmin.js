// File placed in: .update/botadmin.js
module.exports = {
    name: 'botadmin',
    description: 'Displays the official structural admin information.',
    category: 'owner', // 🎯 This matches your folder name! The upgraded engine reads this and puts it in commands/owner/
    async execute(sock, msg, args) {
        const from = msg.key.remoteJid;
        const adminInfo = `👑 *BOT ADMIN* 👑\n\n` +
                          `👤 *Admin Name:* Emmysmart Hub\n` +
                          `📱 *Contact:* wa.me/2348107106127\n` ;
                          
        await sock.sendMessage(from, { text: adminInfo });
    }
};
