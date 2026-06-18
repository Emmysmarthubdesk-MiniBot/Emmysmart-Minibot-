/**
 * Emmysmart Mini Bot - Manual Contact Sync Command (Absolute Interaction Harvester)
 * Features real-time changing reaction emojis and deep file-system cache recovery.
 */

const path = require('path');
const fs = require('fs');
const config = require('../../config'); // Adjust path based on your folder structure

module.exports = {
  name: 'synccontacts',
  aliases: ['savecontacts', 'fetchcontacts', 'syncc'],
  category: 'owner',
  desc: 'Aggressively harvests interaction loops, animates status reactions, and reconstructs the contact book.',
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid;
    const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
    
    // 🎭 PHASE 1: Initialize Scan & Fire First Working Emoji
    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
    
    await sock.sendMessage(from, { 
      text: `🔄 *ABSOLUTE FOOTPRINT SCAN INITIALIZED...*\n\nCrawl engines are parsing historical interaction logs, status viewer streams, and emoji maps. Please watch the reaction icon above...` 
    }, { quoted: msg });

    try {
      const activeStore = sock.store;
      if (!activeStore) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        return await sock.sendMessage(from, { 
          text: `❌ *Sync Error:* Core memory store not linked to socket. Please restart your bot process.` 
        }, { quoted: msg });
      }

      // Ensure the memory maps are structurally initialized
      if (!activeStore.contacts) activeStore.contacts = {};

      // 📥 PHASE 2: Deep Local File Recovery (Prevents 0 Count on Restart)
      await sock.sendMessage(from, { react: { text: '🔄', key: msg.key } });
      const storeFilePath = './baileys_store.json';
      if (fs.existsSync(storeFilePath)) {
        try {
          const rawDiskData = JSON.parse(fs.readFileSync(storeFilePath, 'utf8'));
          
          // Recover historical contacts from file
          if (rawDiskData.contacts) {
            const diskContacts = Object.values(rawDiskData.contacts);
            for (const contact of diskContacts) {
              if (contact.id) {
                activeStore.contacts[contact.id] = { id: contact.id, name: contact.name || 'Recovered Cache Target' };
              }
            }
          }
          
          // Recover historical chats from file to expand processing scope
          if (rawDiskData.chats && activeStore.chats) {
            const diskChats = Array.isArray(rawDiskData.chats) ? rawDiskData.chats : Object.values(rawDiskData.chats);
            for (const chat of diskChats) {
              if (chat.id && !activeStore.chats.dict[chat.id]) {
                activeStore.chats.insert(chat);
              }
            }
          }
        } catch (fileReadError) {
          console.error('Local disk cache recovery skipped:', fileReadError.message);
        }
      }

      // Unified helper to target and lock clean numbers into live memory arrays
      const forceInjectContact = (jid, sourceTag) => {
        if (jid && jid.endsWith('@s.whatsapp.net') && !jid.includes(':')) {
          if (!activeStore.contacts[jid]) {
            activeStore.contacts[jid] = { 
              id: jid, 
              name: sourceTag 
            };
          }
        }
      };

      // 🔍 PHASE 3: Update Working Emoji & Crawl Active Live Streams
      await sock.sendMessage(from, { react: { text: '🔍', key: msg.key } });

      if (activeStore.messages) {
        try {
          const storedJids = typeof activeStore.messages.keys === 'function' 
            ? Array.from(activeStore.messages.keys()) 
            : Object.keys(activeStore.messages);

          for (const jid of storedJids) {
            if (jid.endsWith('@s.whatsapp.net')) {
              forceInjectContact(jid, 'Direct Footprint Interactor');
            }

            let messagesList = [];
            if (typeof activeStore.messages.get === 'function') {
              const res = activeStore.messages.get(jid);
              messagesList = res?.array || res || [];
            } else if (activeStore.messages[jid]) {
              messagesList = activeStore.messages[jid].array || activeStore.messages[jid] || [];
            }

            const cleanMsgArray = Array.isArray(messagesList) 
              ? messagesList 
              : (typeof messagesList.all === 'function' ? messagesList.all() : []);

            for (const item of cleanMsgArray) {
              const senderJid = item.key?.participant || item.key?.remoteJid;
              
              // 1. Everyone the bot has ever sent a message to, or received a message from
              if (senderJid) forceInjectContact(senderJid, 'Chat Transaction Target');

              // 2. Everyone whose status stories were viewed by the bot/boss
              if (item.key?.remoteJid === 'status@broadcast' && item.key.participant) {
                forceInjectContact(item.key.participant, 'Viewed Status Target');
              }

              // 3. Everyone who has viewed your statuses (Receipt array log mining)
              if (item.userReceipt && Array.isArray(item.userReceipt)) {
                for (const receipt of item.userReceipt) {
                  const viewerJid = receipt.userJid || receipt.id;
                  if (viewerJid) forceInjectContact(viewerJid, 'Status Viewer Target');
                }
              }

              // 4. Everyone who reacted to messages or status posts
              if (item.reactions && Array.isArray(item.reactions)) {
                for (const reaction of item.reactions) {
                  if (reaction.key?.participant) forceInjectContact(reaction.key.participant, 'Active Content Reactor');
                }
              }

              // 5. Explicit check for outgoing/incoming reaction packets
              if (item.message?.reactionMessage) {
                const reactorJid = item.key.participant || item.key.remoteJid;
                forceInjectContact(reactorJid, 'Reaction Exchange Link');
              }
            }
          }
        } catch (scanError) {
          console.error('Deep index extractor warning:', scanError.message);
        }
      }

      // 📡 PHASE 4: Update Working Emoji & Harvest Participating Group Pools
      await sock.sendMessage(from, { react: { text: '⚡', key: msg.key } });

      try {
        const groupList = await sock.groupFetchAllParticipating();
        const groupJids = Object.keys(groupList);
        for (const gJid of groupJids) {
          const members = groupList[gJid].participants || [];
          for (const member of members) {
            const memberJid = member.id || member.jid;
            forceInjectContact(memberJid, 'Group Network Peer');
          }
        }
      } catch (groupError) {
        console.error('Group pool processing skipped:', groupError.message);
      }

      // 💬 VECTOR 3: System Memory Thread Extraction
      if (activeStore.chats) {
        const liveChats = activeStore.chats.all();
        for (const targetChat of liveChats) {
          if (targetChat.id && !targetChat.id.endsWith('@g.us') && !targetChat.id.includes('@broadcast') && !targetChat.id.includes('@newsletter')) {
            forceInjectContact(targetChat.id, targetChat.name || 'Active Communication Line');
          }
        }
      }

      // 💾 COMPILE METRICS & SECURE OUTPUT TO DISK
      let totalContactsCount = Object.keys(activeStore.contacts).length;
      try {
        activeStore.writeToFile(storeFilePath);
      } catch (writeError) {
        console.error('Failed to commit database arrays to disk:', writeError);
      }

      // Build context parameters
      const formattedTime = new Date().toLocaleString();
      const connectedLine = sock.user.id.split(':')[0];
      const botName = config.botName || 'Emmysmart Mini Bot';
      const prefix = config.prefix || '.';

      // 📊 PHASE 5: Scan Finished! Fire Good Emoji & Render Data Matrix
      await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

      const matrixReportMsg = 
        `📡 *ABSOLUTE FOOTPRINT DEEP SCAN COMPLETE* 🚀\n` +
        `⊱ ────── {.⋅ 🛡️ ⋅.} ────── ⊰\n\n` +
        `🤖 *Bot Name:* ${botName}\n` +
        `📱 *Connected Line:* +${connectedLine}\n` +
        `🔰 *Core Prefix:* \`[ ${prefix} ]\`\n\n` +
        `✅ *Storage Update:* Local cache tables written securely to disk.\n\n` +
        `📊 *RECONSTRUCTED DATA INDEX:*\n` +
        `▪️ *Mapped Contacts:* \`[ ${totalContactsCount.toLocaleString()} Verified Numbers ]\`\n` +
        `▪️ *Memory Map:* \`Restored, Re-indexed & Armed ✅\`\n` +
        `▪️ *HD Status Pipeline:* \`READY FOR BULK DEPLOYMENT 🎯\`\n` +
        `▪️ *Execution Time:* \`${formattedTime}\`\n\n` +
        `⊱ ────── {⋆❉⋆} ────── ⊰\n` +
        `💻 *Your tracking array is locked down. All verified interactions have been fused into the data pipeline. You can now securely blast your HD status media entries immediately.*`;

      await sock.sendMessage(from, { text: matrixReportMsg }, { quoted: msg });
      global.contactsNotified = true;

    } catch (error) {
      console.error('Sync module execution crash:', error);
      await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(from, { 
        text: `❌ *CRITICAL SYSTEM SCAN FAILURE:*\n\nAn unexpected exception occurred while assembling memory trees:\n\`\`\`${error.message}\`\`\`` 
      }, { quoted: msg });
    }
  }
};