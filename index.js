/**
 * WhatsApp MD Bot - Main Entry Point (A1 Formula Architecture - Final Production Multi-Tier License System)
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
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const readline = require('readline');
const config = require('./config');
const handler = require('./handler');

// 🔄 SAFE MULTI-VERSION IMPORTS FOR WHATSAPP CORE
const Baileys = require('@whiskeysockets/baileys');
const makeWASocket = Baileys.default || Baileys;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, delay } = Baileys;

// 🛡️ DYNAMIC FIX FOR "makeInMemoryStore is not a function"
let makeInMemoryStore;
if (typeof Baileys.makeInMemoryStore === 'function') {
  makeInMemoryStore = Baileys.makeInMemoryStore;
} else {
  try {
    const internalStore = require('@whiskeysockets/baileys/lib/Store');
    makeInMemoryStore = internalStore.makeInMemoryStore || internalStore.default;
  } catch (e) {
    try {
      makeInMemoryStore = require('@whiskeysockets/baileys/lib/Store/make-in-memory-store');
    } catch (err) {
      makeInMemoryStore = () => ({
        contacts: {},
        messages: {},
        chats: { dict: {}, all: () => [] },
        bind: () => {},
        readFromFile: () => {},
        writeToFile: () => {}
      });
    }
  }
}

// Import System Utilities
const antidelete = require('./utils/antidelete');
const autoreact = require('./utils/autoreact');
const contactsUtil = require('./utils/contacts'); 

function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
  } catch (err) {}
}

const validCodes = ['EMMY-RUN-8MIN', 'EMMY-24HOURS', 'EMMY-7DAYS', 'EMMY-30DAYS', 'EMMY-PREMIUM-LIFE', 'EMMY-PRO-RENEWAL'];

function verifySystemLicense() {
  const currentCode = config.activationCode || '';

  if (currentCode === 'EMMY-EXPIRED') {
    originalConsoleLog('\n❌ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    originalConsoleLog('🚨 [SYSTEM LOG]: YOUR RUNTIME PLAN HAS EXPIRED!');
    originalConsoleLog(' STATUS: SHUTTING DOWN ENGINE SAFELY.');
    originalConsoleLog(' ACTION REQUIRED: CONTACT THE MAIN ADMIN FOR A NEW RENEWAL PASS.');
    originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { valid: false, reason: 'EXPIRED' };
  }

  if (!validCodes.includes(currentCode)) {
    originalConsoleLog('\n❌ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    originalConsoleLog('🚨 [SECURITY ALERT]: INVALID OR TAMPERED ACTIVATION KEY!');
    originalConsoleLog(' STATUS: CRITICAL ENGINE BLOCK.');
    originalConsoleLog(' ACTION REQUIRED: ENTER A VALID BOSS RUNNING CODE.');
    originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { valid: false, reason: 'INVALID_TOKEN' };
  }

  const timedCodes = {
    'EMMY-24HOURS': 24 * 60 * 60 * 1000,
    'EMMY-7DAYS': 7 * 24 * 60 * 60 * 1000,
    'EMMY-30DAYS': 30 * 24 * 60 * 60 * 1000
  };

  if (timedCodes[currentCode]) {
    const trackingFile = path.join(__dirname, './utils/expiry_tracker.json');
    const allowedDuration = timedCodes[currentCode];
    let startTime = Date.now();

    if (fs.existsSync(trackingFile)) {
      try {
        const trackerData = JSON.parse(fs.readFileSync(trackingFile, 'utf8'));
        if (trackerData.code === currentCode) {
          startTime = trackerData.activatedAt;
        } else {
          fs.writeFileSync(trackingFile, JSON.stringify({ code: currentCode, activatedAt: startTime }), 'utf8');
        }
      } catch (e) {
        fs.writeFileSync(trackingFile, JSON.stringify({ code: currentCode, activatedAt: startTime }), 'utf8');
      }
    } else {
      if (!fs.existsSync(path.join(__dirname, './utils'))) fs.mkdirSync(path.join(__dirname, './utils'), { recursive: true });
      fs.writeFileSync(trackingFile, JSON.stringify({ code: currentCode, activatedAt: startTime }), 'utf8');
    }

    const timeElapsed = Date.now() - startTime;
    const timeLeft = allowedDuration - timeElapsed;

    if (timeLeft <= 0) {
      originalConsoleLog(`\n❌ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚨 [SYSTEM LOG]: THE ${currentCode.split('-')[1]} PLAN HAS RUN OUT EXPIRED!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      return { valid: false, reason: 'EXPIRED' };
    }
    
    const hoursLeft = (timeLeft / (1000 * 60 * 60)).toFixed(1);
    const daysLeft = (timeLeft / (1000 * 60 * 60 * 24)).toFixed(1);
    originalConsoleLog(`\n⏳ [PLAN ACTIVE]: Plan verified. Running on ${currentCode.split('-')[1]} authorization layer. (${currentCode === 'EMMY-24HOURS' ? hoursLeft + ' Hours' : daysLeft + ' Days'} Remaining)\n`);
  }

  return { valid: true, reason: 'AUTHORIZED' };
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

const baileysStore = makeInMemoryStore({ logger: pino({ level: 'silent' }).child({ level: 'silent', stream: 'store' }) });
baileysStore.readFromFile('./baileys_store.json');
setInterval(() => {
  try { baileysStore.writeToFile('./baileys_store.json'); } catch (e) {}
}, 10000);

const processedMessages = new Set();
setInterval(() => processedMessages.clear(), 5 * 60 * 1000);

const antiDeleteStore = new Map();
let globalPairingLock = false;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
  const licenseCheck = verifySystemLicense();
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

  if (!licenseCheck.valid && licenseCheck.reason === 'INVALID_TOKEN') {
    process.exit(1);
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false, 
    browser: ['Mac OS', 'Chrome', '124.0.0.0'],
    auth: state,
    getMessage: async () => undefined
  });

  store.bind(sock.ev);
  baileysStore.bind(sock.ev);
  sock.store = baileysStore;

  if (!sock.authState.creds.registered && !globalPairingLock) {
    globalPairingLock = true;
    await delay(3000);
    originalConsoleLog(`\n📲 [PAIRING ENGINE]: Preparing deployment handshake...`);
    
    let targetPhone = config.ownerNumber[0] ? config.ownerNumber[0].replace(/[^0-9]/g, '') : '';
    
    if (!targetPhone) {
      const inputNumber = await question(`\n👉 Please enter your WhatsApp pairing number:\n> `);
      targetPhone = inputNumber.replace(/[^0-9]/g, '');
    }

    if (targetPhone) {
      try {
        await delay(2000);
        let code = await sock.requestPairingCode(targetPhone);
        code = code?.match(/.{1,4}/g)?.join('-') || code;
        originalConsoleLog(`\n🔑 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        originalConsoleLog(`📌 YOUR WHATSAPP PAIRING CODE IS:  👉  ${code.toUpperCase()}  👈`);
        originalConsoleLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      } catch (pairingError) {
        originalConsoleLog(`❌ Pairing registration failed.`, pairingError.message);
        globalPairingLock = false;
      }
    }
  }

  let lastActivity = Date.now();
  sock.ev.on('messages.upsert', () => lastActivity = Date.now());
  const watchdogInterval = setInterval(async () => {
    if (Date.now() - lastActivity > 30 * 60 * 1000 && sock.ws.readyState === 1) {
      await sock.end(undefined, undefined, { reason: 'inactive' });
      clearInterval(watchdogInterval);
    }
  }, 5 * 60 * 1000);

  const sendExpiryNotification = async () => {
    try {
      const ownerJid = config.ownerNumber[0].endsWith('@s.whatsapp.net') ? config.ownerNumber[0] : `${config.ownerNumber[0]}@s.whatsapp.net`;
      const cleanAdminNumber = config.adminNumber.replace(/[^0-9]/g, '');
      
      const expiredWarningMsg = 
        `⚠️ *EMMYSMART BOT SYSTEM SUSPENDED* ⚠️\n` +
        `⊱ ────── {.⋅ 🔒 ⋅.} ────── ⊰\n\n` +
        `🚨 *Notice:* Your system allocated plan time has ended. The script has entered locked fallback mode.\n\n` +
        `🛠️ *RENEW PLAN:* \n` +
        `To restore automated triggers immediately, please purchase a renewal sequence pass from the lead administrator.\n\n` +
        `👤 *Contact Admin Inbox:* wa.me/${cleanAdminNumber}\n\n` +
        `_System Protocol: Core Engine Architecture_`;

      await sock.sendMessage(ownerJid, { text: expiredWarningMsg });
    } catch (err) {}
  };

  if (!licenseCheck.valid && licenseCheck.reason === 'EXPIRED') {
    sock.ev.on('connection.update', async (update) => {
      if (update.connection === 'open') {
        await sendExpiryNotification();
        setTimeout(() => { process.exit(1); }, 4000);
      }
    });
    return sock;
  }

  if (config.activationCode === 'EMMY-RUN-8MIN') {
    setTimeout(async () => {
      clearInterval(watchdogInterval);
      await sendExpiryNotification();
      try {
        const configPath = path.join(__dirname, 'config.js');
        let configContent = fs.readFileSync(configPath, 'utf8');
        configContent = configContent.replace("activationCode: 'EMMY-RUN-8MIN'", "activationCode: 'EMMY-EXPIRED'");
        fs.writeFileSync(configPath, configContent, 'utf8');
      } catch (e) {}
      setTimeout(() => { process.exit(1); }, 4000);
    }, 8 * 60 * 1000); 
  }

  const activeCodeStr = config.activationCode || '';
  if (['EMMY-24HOURS', 'EMMY-7DAYS', 'EMMY-30DAYS'].includes(activeCodeStr)) {
    const limitsMap = { 'EMMY-24HOURS': 24*60*60*1000, 'EMMY-7DAYS': 7*24*60*60*1000, 'EMMY-30DAYS': 30*24*60*60*1000 };
    
    const livePlanInterval = setInterval(async () => {
      const trackingFile = path.join(__dirname, './utils/expiry_tracker.json');
      if (fs.existsSync(trackingFile)) {
        try {
          const trackerData = JSON.parse(fs.readFileSync(trackingFile, 'utf8'));
          const maxAllowed = limitsMap[activeCodeStr];
          if (Date.now() - trackerData.activatedAt >= maxAllowed) {
            clearInterval(livePlanInterval);
            clearInterval(watchdogInterval);
            await sendExpiryNotification();
            try {
              const configPath = path.join(__dirname, 'config.js');
              let configContent = fs.readFileSync(configPath, 'utf8');
              configContent = configContent.replace(`activationCode: '${activeCodeStr}'`, "activationCode: 'EMMY-EXPIRED'");
              fs.writeFileSync(configPath, configContent, 'utf8');
            } catch (e) {}
            setTimeout(() => { process.exit(1); }, 4000);
          }
        } catch (err) {}
      }
    }, 60 * 60 * 1000);
  }

  // --- CONNECTION MANAGEMENT ---
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      if (statusCode === 401 || statusCode === 411 || lastDisconnect?.error?.message?.includes('bad mac')) {
        globalPairingLock = false;
        try { if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile); } catch (e) {}
        setTimeout(() => startBot(), 5000);
        return;
      }

      if (shouldReconnect) {
        setTimeout(() => startBot(), 10000);
      }
    } else if (connection === 'open') {
      globalPairingLock = false; 
      console.log('\n✅ System Handshake Complete! Dashboard Synchronized.');
      
      try {
        await sock.newsletterFollow("120363410039942242@newsletter");
      } catch (err) {}

      if (config.autoBio) await sock.updateProfileStatus(`${config.botName} | Active 24/7`);

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

        let activeCommandsList = '';
        try { if (antidelete.load().enabled || antidelete.load().statusEnabled) activeCommandsList += `*▪️ Anti-Delete Protection:* \`Active ✅\`\n`; } catch (e) {}
        try { if (require('./utils/statusview').load().enabled) activeCommandsList += `*▪️ Auto-Status Viewer:* \`Active ✅\`\n`; } catch (e) {}
        try { if (require('./utils/statusreact').load().enabled) activeCommandsList += `*▪️ Auto-Status React (🥰):* \`Active ✅\`\n`; } catch (e) {}
        try { if (contactsUtil.load().autoSaveContacts) activeCommandsList += `*▪️ Contact Auto-Saver:* \`Active ✅\`\n`; } catch (e) {}
        try { if (require('./utils/autoreact').load().enabled) activeCommandsList += `*▪️ Auto-Message React:* \`Active ✅\`\n`; } catch (e) {}

        if (!activeCommandsList) activeCommandsList = `*▪️ Base Engine Layer:* \`Set & Running ✅\`\n`;

        const humanReadableTiers = {
          'EMMY-RUN-8MIN': '8 Minutes Trial Plan',
          'EMMY-24HOURS': '24 Hours Premium Ticket',
          'EMMY-7DAYS': '7 Days Weekly Premium',
          'EMMY-30DAYS': '30 Days Monthly Pass',
          'EMMY-PREMIUM-LIFE': 'Unlimited Premium Lifetime Allocation'
        };

        const currentTierDisplay = humanReadableTiers[config.activationCode] || 'Standard Operational License';

        const connectMsg = 
          `✨ *RENEWAL SUCCESSFUL!* ✨\n` +
          `⊱ ────── {.⋅ 🛡️ ⋅.} ────── ⊰\n\n` +
          `🤖 *System Status:* Secure & Fully Authorized.\n\n` +
          `📊 *SERVER PLAN REAL-TIME DASHBOARD*\n` +
          `📡 *Engine Status:* Active 🚀\n` +
          `⏱️ *Current Plan:* ${currentTierDisplay}\n` +
          `🗂️ *Active Modules:* \`[ ${commandCount > 0 ? commandCount : 1} Set & Running ]\`\n` +
          `🔰 *Core Prefix:* \`[ ${config.prefix} ]\`\n` +
          `📱 *Connected Line:* +${sock.user.id.split(':')[0]}\n\n` +
          `🛡️ *MONITORED FEATURES*\n` +
          `${activeCommandsList}\n` +
          `⊱ ────── {⋆❉⋆} ────── ⊰\n` +
          `💻 *Type \`${config.prefix}menu\` inside your chat layout to see system operations.*\n\n` +
          `_Powered by Emmysmart Global Core vA1_`;

        await sock.sendMessage(ownerJid, { text: connectMsg });

        // 📚 ALERTER 1: LOCAL JSON CONTACT CACHE CHECK
        setTimeout(async () => {
          try {
            const cachedCount = Object.keys(baileysStore.contacts || {}).length;
            if (cachedCount > 1) {
              await sock.sendMessage(ownerJid, { 
                text: `📚 *CONTACT BOOK DATABASE ONLINE!*\n\n✅ Memory engine successfully loaded *${cachedCount}* verified contacts from local cache (\`baileys_store.json\`). HD Status operations are primed and ready!` 
              });
              global.contactsNotified = true;
            }
          } catch (e) {}
        }, 6000);

      } catch (err) {}
    }
  });
    
    sock.ev.on('creds.update', saveCreds);

  // 📡 ALERTER 2: LIVE STREAM PHONEBOOK HANDSHAKE COMPLETE
  sock.ev.on('messaging-history.set', async ({ contacts }) => {
    if (!global.contactsNotified && contacts && contacts.length > 0) {
      global.contactsNotified = true;
      try {
        const ownerJid = config.ownerNumber[0].endsWith('@s.whatsapp.net') ? config.ownerNumber[0] : `${config.ownerNumber[0]}@s.whatsapp.net`;
        await sock.sendMessage(ownerJid, {
          text: `📡 *CONTACT BOOK SYNCHRONIZATION COMPLETE!*\n\n✅ Successfully pulled and structural-mapped *${contacts.length}* active phone contacts directly from your phone stream. HD status modules are armed!`
        });
      } catch (err) {}
    }
  });

  const isSystemJid = (jid) => jid.includes('@broadcast') || jid.includes('status.broadcast') || jid.includes('@newsletter');

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || !msg.key?.id) continue;
      const from = msg.key.remoteJid;
      const myJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';

      const contactDb = contactsUtil.load();
      if (contactDb.autoSaveContacts && msg.pushName && !msg.key.fromMe && !from.endsWith('@g.us') && !isSystemJid(from)) {
        try {
          const cleanNumber = from.split('@')[0];
          const taggedName = `${msg.pushName} 🤔`; 
          await sock.updateContactName(from, taggedName);
          const vcard = 'BEGIN:VCARD\nVERSION:3.0\n' + `FN:${taggedName}\n` + `TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}\n` + 'END:VCARD';
          await sock.sendMessage(myJid, { contacts: { displayName: taggedName, contacts: [{ vcard }] } }, { ephemeralExpiration: 60 }); 
          await sock.sendMessage(myJid, { text: `👤✅ *Contact Auto-Saved!*\n\n*Name:* ${taggedName}\n*Number:* +${cleanNumber}` });
        } catch (err) {}
      }

      if (msg.message.conversation || msg.message.extendedTextMessage) {
        const text = msg.message.conversation || msg.message.extendedTextMessage.text;
        if (text && text.startsWith(config.prefix) && !msg.key.fromMe) {
          await sock.sendPresenceUpdate('composing', from).catch(() => {}); 
        }
      }

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
                else if (rawMsg.imageMessage) messageContent = rawMsg.imageMessage.caption ? `[MEDIA] ${rawMsg.imageMessage.caption}` : '[MEDIA] (Image)';
                else if (rawMsg.videoMessage) messageContent = rawMsg.videoMessage.caption ? `[MEDIA] ${rawMsg.videoMessage.caption}` : '[MEDIA] (Video)';
                else if (rawMsg.audioMessage) messageContent = '[MEDIA] (Audio Voice)';
                else if (rawMsg.documentMessage) messageContent = `[MEDIA] (Document: ${rawMsg.documentMessage.fileName || 'File'})`;
                
                const senderName = savedMsg.pushName || 'Unknown User';
                const formattedTime = new Date(savedMsg.messageTimestamp * 1000).toLocaleTimeString();

                let targetAlert = `━━━━━ 🚨 *DELETED ${isStatusDeletion ? 'STATUS' : 'MESSAGE'}* 🚨 ━━━━━\n\n`;
                targetAlert += `👤 *Sender:* ${senderName}\n🆔 *Number:* +${senderJid.split(':')[0]}\n🕒 *Time:* ${formattedTime}\n\n📝 *Content:* ${messageContent}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
                await sock.sendMessage(myJid, { text: targetAlert });
                if (rawMsg.imageMessage || rawMsg.videoMessage || rawMsg.audioMessage || rawMsg.documentMessage) {
                  await sock.sendMessage(myJid, { forward: savedMsg });
                }
                antiDeleteStore.delete(deletedKey.id);
              }
            } catch (err) {}
          }
        }
      }

      if (from === 'status@broadcast') {
        const sender = msg.key.participant || '';
        if (msg.key.fromMe || sender.split(':')[0] === sock.user.id.split(':')[0]) continue;
        try {
          const statusview = require('./utils/statusview');
          const statusreact = require('./utils/statusreact');
          if (statusview.load().enabled) await sock.readMessages([msg.key]);
          if (statusreact.load().enabled) {
            await sock.sendMessage('status@broadcast', { react: { text: '🥰', key: msg.key } }, { statusJidList: [msg.key.participant] });
          }
        } catch (err) {}
        continue;
      }

      const ardb = autoreact.load();
      if (ardb.enabled && !msg.key.fromMe) {
        try { await sock.sendMessage(from, { react: { text: '❤️', key: msg.key } }); } catch (err) {}
      }

      if (isSystemJid(from) || processedMessages.has(msg.key.id)) continue;
      processedMessages.add(msg.key.id);

      try {
        if (require('./utils/online').load().enabled) await sock.sendPresenceUpdate('available', from);
        await handler.handleMessage(sock, msg);
      } catch (err) {}
    }
  });

  return sock;
}

cleanupPuppeteerCache();
startBot().catch(err => { process.exit(1); });

module.exports = { store };