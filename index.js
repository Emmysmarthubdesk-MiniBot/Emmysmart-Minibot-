/**
 * WhatsApp MD Bot - Main Entry Point (A1 Formula Architecture)
 * PART 1: System Environments, Safe Logging Overrides, License Verification Layer & Hot-Patching Engine
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
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, downloadContentFromMessage, jidDecode, delay } = require('@whiskeysockets/baileys');
const config = require('./config');
const handler = require('./handler');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');
const readline = require('readline');

// Import System Utilities
const antidelete = require('./utils/antidelete');
const autoreact = require('./utils/autoreact');
const contactsUtil = require('./utils/contacts'); 

// Global Tracker Arrays and Configurations for Hot-Patching
const configPath = path.join(__dirname, 'antivo_config.json');
const updateDir = path.join(__dirname, '.update');
const commandsDir = path.join(__dirname, 'commands');
global.appliedUpdates = [];

// 🚀 [FB UPDATE] - Upgraded Subfolder-Aware Dynamic Hot-Patching File Engine
if (fs.existsSync(updateDir)) {
    const updateFiles = fs.readdirSync(updateDir).filter(file => file.endsWith('.js'));
    if (updateFiles.length > 0) {
        updateFiles.forEach(file => {
            const updateFilePath = path.join(updateDir, file);
            try {
                // Read the module configuration before moving it
                const updatedModule = require(updateFilePath);
                
                // Determine target directory based on category (defaulting to main commands directory)
                let targetSubfolder = commandsDir;
                if (updatedModule.category) {
                    targetSubfolder = path.join(commandsDir, updatedModule.category.toLowerCase());
                }

                // Ensure the category subfolder directory actually exists
                if (!fs.existsSync(targetSubfolder)) {
                    fs.mkdirSync(targetSubfolder, { recursive: true });
                }

                const destinationPath = path.join(targetSubfolder, file);
                
                // Move and apply the modification patch safely
                fs.copyFileSync(updateFilePath, destinationPath);
                
                global.appliedUpdates.push({
                    file: file,
                    name: updatedModule.name || file.replace('.js', ''),
                    desc: updatedModule.description || 'System performance modifications.'
                });
                
                fs.unlinkSync(updateFilePath);
            } catch (err) {
                console.error(`❌ Failed to apply nested patch for ${file}:`, err.message);
            }
        });
    }
}

function cleanupPuppeteerCache() {
  try {
    const home = os.homedir();
    const cacheDir = path.join(home, '.cache', 'puppeteer');
    if (fs.existsSync(cacheDir)) fs.rmSync(cacheDir, { recursive: true, force: true });
  } catch (err) {}
}

// 🕒 ALL BINARY FUSIONS CODES FULLY PRESERVED
const timedCodes = {
  'EMMY-RUN-8MIN': 8 * 60 * 1000,
  'EMMY-24HOURS': 24 * 60 * 60 * 1000,
  'EMMY-7DAYS': 7 * 24 * 60 * 60 * 1000,
  'EMMY-30DAYS': 30 * 24 * 60 * 1000,
  
  '24H-SWAP-A1B2': 24 * 60 * 60 * 1000,
  '24H-EMMY-C3D4': 24 * 60 * 60 * 1000,
  '24H-BOTS-E5F6': 24 * 60 * 60 * 1000,
  '24H-RAIL-G7H8': 24 * 60 * 60 * 1000,
  '24H-GAIN-I9J0': 24 * 60 * 60 * 1000,

  'WK-SWAP-7D11': 7 * 24 * 60 * 60 * 1000,
  'WK-EMMY-7D22': 7 * 24 * 60 * 60 * 1000,
  'WK-BOTS-7D33': 7 * 24 * 60 * 60 * 1000,
  'WK-RAIL-7D44': 7 * 24 * 60 * 60 * 1000,
  'WK-GAIN-7D55': 7 * 24 * 60 * 60 * 1000,

  'emmy-4week': 30 * 24 * 60 * 60 * 1000,
  'MNTH-SWAP-30A': 30 * 24 * 60 * 60 * 1000,
  'MNTH-EMMY-30B': 30 * 24 * 60 * 60 * 1000,
  'MNTH-BOTS-30C': 30 * 24 * 60 * 60 * 1000,
  'MNTH-GAIN-30E': 30 * 24 * 60 * 60 * 1000
};

const validCodes = [...Object.keys(timedCodes), 'EMMY-PREMIUM-LIFE', 'EMMY-PRO-RENEWAL'];

// ⏱️ Dynamic Dashboard Countdown Calculator Tool
function getRemainingTime(code) {
  if (code === 'EMMY-PREMIUM-LIFE' || code === 'EMMY-PRO-RENEWAL') return 'Lifetime Unlimited ♾️';
  if (code === 'EMMY-EXPIRED') return 'Expired Plan Interval 🚨';
  if (!timedCodes[code]) return 'Standard Operational Layer';

  const trackingFile = path.join(__dirname, './utils/expiry_tracker.json');
  if (!fs.existsSync(trackingFile)) return 'Calculating Balance...';

  try {
    const trackerData = JSON.parse(fs.readFileSync(trackingFile, 'utf8'));
    if (trackerData.code !== code) return 'Syncing System Pass...';

    const allowedDuration = timedCodes[code];
    const elapsed = Date.now() - trackerData.activatedAt;
    const remaining = allowedDuration - elapsed;

    if (remaining <= 0) return 'Expired Plan Interval 🚨';

    const secs = Math.floor(remaining / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${mins % 60}m remaining`;
    if (hours > 0) return `${hours}h ${mins % 60}m remaining`;
    return `${mins}m ${secs % 60}s remaining`;
  } catch (err) {
    return 'Active Plan';
  }
}

// 🛡️ FULL PRODUCTION AUTOMATED LICENSE SYSTEM (SURVIVES RESTARTS)
function verifySystemLicense() {
  const currentCode = config.activationCode || '';

  if (currentCode === 'EMMY-PREMIUM-LIFE' || currentCode === 'EMMY-PRO-RENEWAL') {
    return { valid: true, reason: 'AUTHORIZED' };
  }

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
    originalConsoleLog(' ACTION REQUIRED: ENTER A VALID BOSS RUNNING CODE IN CONFIG.JS.');
    originalConsoleLog('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return { valid: false, reason: 'INVALID_TOKEN' };
  }

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
      originalConsoleLog(`\n❌ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🚨 [SYSTEM LOG]: THE ${currentCode} PLAN HAS RUN OUT EXPIRED!\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
      return { valid: false, reason: 'EXPIRED' };
    }
    
    const hoursLeft = (timeLeft / (1000 * 60 * 60)).toFixed(1);
    const daysLeft = (timeLeft / (1000 * 60 * 60 * 24)).toFixed(1);
    originalConsoleLog(`\n⏳ [PLAN ACTIVE]: Plan verified. Up And Running. (${allowedDuration <= 8 * 60 * 1000 ? 'Trial' : currentCode.includes('24H') || currentCode.includes('24HOURS') ? hoursLeft + ' Hours' : daysLeft + ' Days'} Remaining)\n`);
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

  if (!sock.authState.creds.registered && !globalPairingLock) {
    globalPairingLock = true;
    await delay(3000);
    originalConsoleLog(`\n📱 [PAIRING ENGINE]: Preparing deployment handshake...`);
    
    let targetPhone = config.ownerNumber && config.ownerNumber[0] ? config.ownerNumber[0].replace(/[^0-9]/g, '') : '';
    
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
      const firstOwner = config.ownerNumber && config.ownerNumber[0] ? config.ownerNumber[0] : '';
      if (!firstOwner) return;
      const ownerJid = firstOwner.endsWith('@s.whatsapp.net') ? firstOwner : `${firstOwner}@s.whatsapp.net`;
      const cleanAdminNumber = config.adminNumber.replace(/[^0-9]/g, '');
      
      const expiredWarningMsg = 
        `⚠️ *EMMYSMART MINIBOT SYSTEM BROADCAST* ⚠️\n` +
        `🚨 *Notice:* System subscription renewal failed!\n` +
        `❌ *Status:* Your subscription has expired.\n\n` +
        `⚠️ The bot features are unavailable.\n\n` +
        `👤 *Action:* Contact the bot admin to renew your plan.\n\n` +
        `📞 *Direct Link:* wa.me/${cleanAdminNumber}\n`;

      const adminVcard = 
        `BEGIN:VCARD\n` +
        `VERSION:3.0\n` +
        `FN:Emmysmart Bot Admin 👑\n` +
        `TEL;type=CELL;type=VOICE;waid=${cleanAdminNumber}:+${cleanAdminNumber}\n` +
        `END:VCARD`;

      await sock.sendMessage(ownerJid, { text: expiredWarningMsg });
      await sock.sendMessage(ownerJid, { 
        contacts: { 
          displayName: 'Emmysmart Bot Admin 👑', 
          contacts: [{ vcard: adminVcard }] 
        } 
      }, { ephemeralExpiration: 60 });

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
        const configPathFile = path.join(__dirname, 'config.js');
        let configContent = fs.readFileSync(configPathFile, 'utf8');
        configContent = configContent.replace("activationCode: 'EMMY-RUN-8MIN'", "activationCode: 'EMMY-EXPIRED'");
        fs.writeFileSync(configPathFile, configContent, 'utf8');
      } catch (e) {}
      setTimeout(() => { process.exit(1); }, 4000);
    }, 8 * 60 * 1000); 
  }

  const activeCodeStr = config.activationCode || '';
  if (timedCodes[activeCodeStr]) {
    const livePlanInterval = setInterval(async () => {
      const trackingFile = path.join(__dirname, './utils/expiry_tracker.json');
      if (fs.existsSync(trackingFile)) {
        try {
          const trackerData = JSON.parse(fs.readFileSync(trackingFile, 'utf8'));
          const maxAllowed = timedCodes[activeCodeStr];
          if (Date.now() - trackerData.activatedAt >= maxAllowed) {
            clearInterval(livePlanInterval);
            clearInterval(watchdogInterval);
            await sendExpiryNotification();
            try {
              const configPathFile = path.join(__dirname, 'config.js');
              let configContent = fs.readFileSync(configPathFile, 'utf8');
              configContent = configContent.replace(`activationCode: '${activeCodeStr}'`, "activationCode: 'EMMY-EXPIRED'");
              fs.writeFileSync(configPathFile, configContent, 'utf8');
            } catch (e) {}
            setTimeout(() => { process.exit(1); }, 4000);
          }
        } catch (err) {}
      }
    }, 60 * 60 * 1000);
  }

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
        await sock.newsletterFollow(config.newsletterJid);
      } catch (err) {}

      if (config.autoBio) await sock.updateProfileStatus(`${config.botName} | Active 24/7`);

      try {
        const firstOwner = config.ownerNumber && config.ownerNumber[0] ? config.ownerNumber[0] : sock.user.id.split(':')[0];
        const ownerJid = firstOwner.endsWith('@s.whatsapp.net') ? firstOwner : `${firstOwner}@s.whatsapp.net`;
        const liveCountdownString = getRemainingTime(config.activationCode);

        let connectMsg = 
          `🔰 *BOT CONNECTED SUCCESSFULLY!* 🔰\n` +
          `📊 *SERVER PLAN REAL-TIME DASHBOARD*\n` +
          `📡 *Engine Status:* Active 🚀\n` +
          `⏱️ *Validity Left:* \`[ ${liveCountdownString} ]\`\n` +
          `🔰 *Core Prefix:* \`[ ${config.prefix} ]\`\n` +
          `📱 *Connected Line:* +${sock.user.id.split(':')[0]}\n\n`;
          
        if (global.appliedUpdates && global.appliedUpdates.length > 0) {
            connectMsg += `📦 *HOT-PATCH SYSTEM UPDATES OVERVIEW:*\n`;
            global.appliedUpdates.forEach((up, index) => {
                connectMsg += `${index + 1}. *Command:* .${up.name}\n   📝 *Changes:* ${up.desc}\n\n`;
            });
            global.appliedUpdates = []; 
        }
        
        await sock.sendMessage(ownerJid, { text: connectMsg });
      } catch (err) {
        console.error("Dashboard notification send error:", err.message);
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

          const contactDb = contactsUtil.load();
          if (contactDb.autoSaveContacts && msg.pushName && !msg.key.fromMe && !from.endsWith('@g.us') && !isSystemJid(from)) {
              try {
                  const cleanNumber = from.split('@')[0];
                  const taggedName = `${msg.pushName} 🤖`; 
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

          // --------------------------------------------------
          // ANTI-VIEWONCE INTERCEPTOR ENGINE (FIXED DELIVERY)
          // --------------------------------------------------
          try {
              const antivoConfigPath = path.join(__dirname, 'database', 'antivo_config.json');
              let voConfig = { enabled: false };
              if (fs.existsSync(antivoConfigPath)) {
                  try {
                      const raw = fs.readFileSync(antivoConfigPath, 'utf8');
                      if (raw.trim()) {
                          voConfig = JSON.parse(raw);
                      }
                  } catch {
                      voConfig = { enabled: false };
                  }
              }

              if (voConfig.enabled === true) {
                  const message = msg.message;
                  let wrapper = message.viewOnceMessageV2 || message.viewOnceMessageV2Extension || message.viewOnceMessage;
                  let actualMsg = wrapper?.message || message;

                  if (wrapper || message.viewOnce || message.imageMessage?.viewOnce || message.videoMessage?.viewOnce || message.audioMessage?.viewOnce) {
                      const mtype = Object.keys(actualMsg || {})[0];
                      if (mtype) {
                          const media = actualMsg[mtype];
                          let downloadType;

                          if (mtype === 'imageMessage') downloadType = 'image';
                          else if (mtype === 'videoMessage') downloadType = 'video';
                          else if (mtype === 'audioMessage') downloadType = 'audio';

                          if (downloadType) {
                              const stream = await downloadContentFromMessage(media, downloadType);
                              const chunks = [];
                              for await (const chunk of stream) {
                                  chunks.push(chunk);
                              }
                              const buffer = Buffer.concat(chunks);

                              const chatId = msg.key.remoteJid;
                              const senderJid = msg.key.participant || message[Object.keys(message)[0]]?.contextInfo?.participant || (msg.key.fromMe ? sock.user.id : chatId);
                              const decoded = jidDecode(senderJid);
                              const phone = decoded?.user || senderJid?.split('@')[0] || 'Unknown';
                              const originalCaption = media.caption || '';
                              const location = chatId.endsWith('@g.us') ? 'Group Chat' : 'Private Chat';

                              const header = `🥰 *Anti-ViewOnce Interceptor Media* 🥰\n\n👤 *Sender Name:* ${msg.pushName || 'Unknown'}\n📞 *Phone Number:* +${phone}\n📍 *Location:* ${location}\n📝 *Caption:* ${originalCaption}`;

                              // 🎯 TARGETING THE OWNER DIRECTLY INSTEAD OF THE SYSTEM JID MATRIX
                              const firstOwner = config.ownerNumber && config.ownerNumber[0] ? config.ownerNumber[0].replace(/[^0-9]/g, '') : sock.user.id.split(':')[0];
                              const targetLogJid = `${firstOwner}@s.whatsapp.net`;

                              if (mtype === 'imageMessage') {
                                  await sock.sendMessage(targetLogJid, { image: buffer, caption: header, mimetype: 'image/jpeg' });
                              } else if (mtype === 'videoMessage') {
                                  await sock.sendMessage(targetLogJid, { video: buffer, caption: header, mimetype: 'video/mp4' });
                              } else if (mtype === 'audioMessage') {
                                  await sock.sendMessage(targetLogJid, { audio: buffer, mimetype: 'audio/ogg; codecs=opus', ptt: true });
                                  await sock.sendMessage(targetLogJid, { text: header });
                              }
                          }
                      }
                  }
              }
          } catch (err) {
              console.error('[ANTI-VIEWONCE ERROR]', err);
          }
              
          // --------------------------------------------------
          // ANTI-DELETE FUNCTIONALITY
          // --------------------------------------------------
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
                  if ((isStatusDeletion && adeb.statusEnabled) || (!isStatusDeletion && adeb.enabled)) {
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
                                  targetAlert += `👤 *Sender:* ${senderName}\n🆔 *Number:* +${senderJid.split(':')[0]}\n⏰ *Time:* ${formattedTime}\n\n📝 *Content:* ${messageContent}\n`;
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
          }

          // --------------------------------------------------
          // STATUS VIEW AND REACT
          // --------------------------------------------------
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
              try { 
                  await sock.sendMessage(from, { react: { text: ardb.emoji || '❤️', key: msg.key } }); 
              } catch (err) {}
          }

          if (isSystemJid(from) || processedMessages.has(msg.key.id)) continue;
          processedMessages.add(msg.key.id);

          try {
              if (require('./utils/online').load().enabled) await sock.sendPresenceUpdate('available', from);

              const senderNumberRaw = msg.key.participant || msg.key.remoteJid;
              const isOwner = msg.key.fromMe || 
                              (global.sudo && global.sudo.some(num => senderNumberRaw.includes(num.replace(/[^0-9]/g, '')))) || 
                              (config.ownerNumber && config.ownerNumber.some(num => senderNumberRaw.includes(num.replace(/[^0-9]/g, ''))));

              if (config.selfMode && !isOwner) {
                  continue; 
              }

              await handler.handleMessage(sock, msg);
          } catch (err) {
              console.error("Handler error caught safely:", err);
          }
      }
  });
}

cleanupPuppeteerCache();
startBot().catch(err => { console.error("Boot failure:", err); process.exit(1); });

module.exports = { store };