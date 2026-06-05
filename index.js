/**
 * WhatsApp MD Bot - Main Entry Point
 */
process.env.PUPPETEER_SKIP_DOWNLOAD = 'true';
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || '/tmp/puppeteer_cache_disabled';

const { initializeTempSystem } = require('./utils/tempManager');
const { startCleanup } = require('./utils/cleanup');
initializeTempSystem();
startCleanup();

// Console overrides to filter out Signal/Baileys noise
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const forbiddenPatternsConsole = ['closing session', 'closing open session', 'sessionentry', 'prekey bundle', 'pendingprekey', '_chains', 'registrationid', 'currentratchet', 'chainkey', 'ratchet', 'signal protocol', 'ephemeralkeypair', 'indexinfo', 'basekey'];

console.log = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) originalConsoleLog.apply(console, args);
};
console.error = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  const message = args.map(a => typeof a === 'string' ? a : typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ').toLowerCase();
  if (!forbiddenPatternsConsole.some(pattern => message.includes(pattern))) originalConsoleWarn.apply(console, args);
};

const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const config = require('./config');
const handler = require('./handler');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

// Import System Utilities
const antidelete = require('./utils/antidelete');
const autoreact = require('./utils/autoreact');
const contactsUtil = require('./utils/contacts'); // 🔥 NEW: Dedicated Contacts Utility

function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
  } catch (err) {}
}

const store = {
  messages: new Map(),
  maxPerChat: 5, 
  bind: (ev) => {
    ev.on('messages.upsert', ({ messages }) => {
      for (const msg of messages) {
        if (!msg.key?.id) continue;
        const jid = msg.key.remoteJid;
        if (!store.messages.has(jid)) store.messages.set(jid, new Map());
        const chatMsgs = store.messages.get(jid);
        chatMsgs.set(msg.key.id, msg);
        if (chatMsgs.size > store.maxPerChat) {
          const oldestKey = chatMsgs.keys().next().value;
          chatMsgs.delete(oldestKey);
        }
      }
    });
  }
};

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

// Dedicated high-speed cache for Anti-Delete
const antiDeleteStore = new Map();

async function startBot() {
  const sessionFolder = `./${config.sessionName}`;
  const sessionFile = path.join(sessionFolder, 'creds.json');

  if (config.sessionID && config.sessionID.startsWith('KnightBot!')) {
    try {
      const [header, b64data] = config.sessionID.split('!');
      const cleanB64 = b64data.replace('...', '');
      const compressedData = Buffer.from(cleanB64, 'base64');
      const decompressedData = zlib.gunzipSync(compressedData);
      if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder, { recursive: true });
      fs.writeFileSync(sessionFile, decompressedData, 'utf8');
    } catch (e) { console.error('Session error:', e.message); }
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Chrome', 'Windows', '10.0'],
    auth: state,
    getMessage: async () => undefined
  });

  store.bind(sock.ev);

  let lastActivity = Date.now();
  sock.ev.on('messages.upsert', () => lastActivity = Date.now());
  const watchdogInterval = setInterval(async () => {
    if (Date.now() - lastActivity > 30 * 60 * 1000 && sock.ws.readyState === 1) {
      console.log('⚠️ No activity detected. Forcing reconnect...');
      await sock.end(undefined, undefined, { reason: 'inactive' });
      clearInterval(watchdogInterval);
    }
  }, 5 * 60 * 1000);

  // --- CONNECTION UPDATE BLOCK ---
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr && !sock.authState.creds.registered) {
      console.log('\n📱 Session not found or corrupted. Generating Pairing Code...');
      setTimeout(async () => {
        try {
          let phoneNumber = config.ownerNumber[0].replace(/[^0-9]/g, '');
          if (phoneNumber) {
            console.log(`📲 Requesting pairing code for: ${phoneNumber}`);
            let code = await sock.requestPairingCode(phoneNumber);
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`👉 YOUR WHATSAPP PAIRING CODE: \x1b[32m${code}\x1b[0m 👈`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          } else {
            console.log('❌ Error: No valid owner number found in config.js to generate a pairing code.');
          }
        } catch (err) {
          console.error('Failed to generate pairing code:', err.message);
        }
      }, 3000);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log(`⚠️ Connection closed. Status code: ${statusCode}. Reconnecting: ${shouldReconnect}`);
      
      if (statusCode === 411 || lastDisconnect?.error?.message?.includes('bad mac')) {
        console.log('🚨 Corrupted session detected (Bad MAC). Clearing broken credentials...');
        try {
          if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
        } catch (e) {}
        setTimeout(() => startBot(), 2000);
        return;
      }

      if (shouldReconnect) setTimeout(() => startBot(), 3000);
    } else if (connection === 'open') {
      console.log('\n✅ Bot connected successfully!');
      console.log(`📱 Bot Number: ${sock.user.id.split(':')[0]}`);
      
      // 🔥 AUTO-FOLLOW YOUR SPECIFIC CHANNEL UPON CONNECTION
      try {
        await sock.newsletterFollow("120363410039942242@newsletter");
        console.log('✅ Channel (120363410039942242@newsletter) followed automatically.');
      } catch (err) {
        console.error('⚠️ Could not follow channel:', err.message);
      }

      console.log(`🤖 Bot Name: ${config.botName}`);
      console.log(`🔰 Prefix: ${config.prefix}\n`);
      if (config.autoBio) await sock.updateProfileStatus(`${config.botName} | Active 24/7`);

      // 📢 STARTUP NOTIFICATION SYSTEM
      try {
        const ownerJid = config.ownerNumber[0].endsWith('@s.whatsapp.net') ? config.ownerNumber[0] : `${config.ownerNumber[0]}@s.whatsapp.net`;
        
        let commandCount = 0;
        const commandsPath = path.join(__dirname, 'commands');
        if (fs.existsSync(commandsPath)) {
          const folders = fs.readdirSync(commandsPath);
          for (const folder of folders) {
            const fullPath = path.join(commandsPath, folder);
            if (fs.statSync(fullPath).isDirectory()) {
              commandCount += fs.readdirSync(fullPath).filter(file => file.endsWith('.js')).length;
            } else if (folder.endsWith('.js')) {
              commandCount++;
            }
          }
        }

        const connectMsg = `🤖 *Emmysmart Mini Bot Connected Successfully!*\n\n` +
                           `Status: *Online ✅*\n` +
                           `Active Commands: *${commandCount} loaded*\n` +
                           `System Engine: *A1 Formula Loaded 🚀*`;
        
        await sock.sendMessage(ownerJid, { text: connectMsg });
      } catch (err) {
        console.error('Failed to send connection alert to owner:', err.message);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);

  const isSystemJid = (jid) => jid.includes('@broadcast') || jid.includes('status.broadcast') || jid.includes('@newsletter');

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || !msg.key?.id) continue;
      const from = msg.key.remoteJid;
      const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      // 👤 AUTOMATICALLY SAVE NEW CONTACT NAMES (USES NEW DEDICATED UTILITY)
      const contactDb = contactsUtil.load();
      if (contactDb.autoSaveContacts && msg.pushName && !msg.key.fromMe && !from.endsWith('@g.us') && !isSystemJid(from)) {
        try {
          await sock.updateContactName(from, msg.pushName);
        } catch (err) { /* Silent fallback if contact map can't write instantly */ }
      }

      // ⚡ EXPRESS PROCESSING BLOCK (Ignoring Self-Messages for Typing presence)
      if (msg.message.conversation || msg.message.extendedTextMessage) {
        const text = msg.message.conversation || msg.message.extendedTextMessage.text;
        if (text && text.startsWith(config.prefix) && !msg.key.fromMe) {
          await sock.sendPresenceUpdate('composing', from).catch(() => {}); 
        }
      }

      // ------------------------------------------------------------------
      // 🛡️ ANTI-DELETE SECTION (DUAL-TOGGLE AWARE)
      // ------------------------------------------------------------------
      const adeb = antidelete.load();

      if (adeb.enabled || adeb.statusEnabled) {
        if (!msg.message.protocolMessage && !msg.message.reactionMessage) {
          antiDeleteStore.set(msg.key.id, msg);
          setTimeout(() => antiDeleteStore.delete(msg.key.id), 60 * 60 * 1000); 
        }

        const protocolMsg = msg.message.protocolMessage;
        if (protocolMsg && protocolMsg.type === 0) {
          const deletedKey = protocolMsg.key;
          const isStatusDeletion = deletedKey.remoteJid === 'status@broadcast';

          // 🔥 Check if separate toggle configurations permit processing
          if (isStatusDeletion && !adeb.statusEnabled) continue;
          if (!isStatusDeletion && !adeb.enabled) continue;

          const savedMsg = antiDeleteStore.get(deletedKey.id);

          if (savedMsg) {
            try {
              const senderJid = deletedKey.participant || deletedKey.remoteJid;
              
              if (senderJid !== myJid) {
                let messageContent = '';
                const rawMsg = savedMsg.message;

                if (rawMsg.conversation) messageContent = rawMsg.conversation;
                else if (rawMsg.extendedTextMessage?.text) messageContent = rawMsg.extendedTextMessage.text;
                else if (rawMsg.imageMessage) messageContent = rawMsg.imageMessage.caption ? `[MEDIA] ${rawMsg.imageMessage.caption}` : '[MEDIA] (Image File)';
                else if (rawMsg.videoMessage) messageContent = rawMsg.videoMessage.caption ? `[MEDIA] ${rawMsg.videoMessage.caption}` : '[MEDIA] (Video File)';
                else if (rawMsg.audioMessage) messageContent = '[MEDIA] (Audio Note)';
                else if (rawMsg.documentMessage) messageContent = `[MEDIA] (Document: ${rawMsg.documentMessage.fileName || 'File'})`;
                else messageContent = '_Unknown or Unsupported Message Type_';

                const senderName = savedMsg.pushName || 'Unknown User';
                const formattedTime = new Date(savedMsg.messageTimestamp * 1000).toLocaleTimeString();

                let targetAlert = `━━━━━ 🚨 *DELETED ${isStatusDeletion ? 'STATUS' : 'MESSAGE'}* 🚨 ━━━━━\n\n`;
                targetAlert += `👤 *Sender Name:* ${senderName}\n`;
                targetAlert += `🆔 *Sender JID:* ${senderJid.split(':')[0]}\n`;
                targetAlert += `⏰ *Timestamp:* ${formattedTime}\n`;
                targetAlert += `💬 *Chat:* ${isStatusDeletion ? 'Status Update' : from.endsWith('@g.us') ? 'Group Chat' : 'Private DM'}\n\n`;
                targetAlert += `📝 *Content:* ${messageContent}\n`;
                targetAlert += `━━━━━━━━━━━━━━━━━━━━━━━━━━`;

                await sock.sendMessage(myJid, { text: targetAlert });

                if (rawMsg.imageMessage || rawMsg.videoMessage || rawMsg.audioMessage || rawMsg.documentMessage) {
                  await sock.sendMessage(myJid, { forward: savedMsg });
                }
                antiDeleteStore.delete(deletedKey.id);
              }
            } catch (err) { console.error('Anti-Delete Error:', err.message); }
          }
        }
      }
      // ------------------------------------------------------------------

      // 1. Status Handling Block
      if (from === 'status@broadcast') {
        const sender = msg.key.participant || '';
        // ❌ STOP BOT FROM VIEWING OR REACTING TO YOUR OWN STATUS
        if (msg.key.fromMe || sender.split(':')[0] === sock.user.id.split(':')[0]) {
          continue;
        }

        try {
          const statusview = require('./utils/statusview');
          const statusreact = require('./utils/statusreact');
          const viewdb = statusview.load();
          const reactdb = statusreact.load();

          if (viewdb.enabled) await sock.readMessages([msg.key]);
          if (reactdb.enabled) {
            await sock.sendMessage('status@broadcast', { 
              react: { text: '🥰', key: msg.key } 
            }, { statusJidList: [msg.key.participant] });
          }
        } catch (err) { console.error('Status Error:', err.message); }
        continue;
      }

      // 2. Auto-React System
      const ardb = autoreact.load();
      if (ardb.enabled && !msg.key.fromMe) {
        try {
          await sock.sendMessage(from, { react: { text: '❤️', key: msg.key } });
        } catch (err) { console.error('Auto-React Error:', err.message); }
      }

      // 3. System JID & Duplicate Message Filter Block
      if (isSystemJid(from) || processedMessages.has(msg.key.id)) continue;
      processedMessages.add(msg.key.id);

      // 4. Command Handling
      try {
        const online = require('./utils/online');
        const onlinedb = online.load();
        
        if (onlinedb.enabled) {
            await sock.sendPresenceUpdate('available', from);
        }

        await handler.handleMessage(sock, msg);
      } catch (err) {
        console.error('Handler error:', err.message);
      }
    }
  });

  return sock;
}

cleanupPuppeteerCache();
startBot().catch(err => { console.error('Fatal error:', err); process.exit(1); });

module.exports = { store };