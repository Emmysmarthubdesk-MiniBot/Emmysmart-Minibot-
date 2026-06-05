/**
 * Message Handler - Processes incoming messages and executes commands
 */

const config = require('./config');
const database = require('./database');
const { loadCommands } = require('./utils/commandLoader');
const { addMessage } = require('./utils/groupstats');
const { load } = require('./utils/autotyping');
const { jidDecode, jidEncode } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Group metadata cache to prevent rate limiting
const groupMetadataCache = new Map();
const CACHE_TTL = 60000; // 1 minute cache

// Load all commands
const commands = loadCommands();

// System JID filter
const isSystemJid = (jid) => {
  if (!jid) return true;
  return jid.includes('@broadcast') || 
         jid.includes('status.broadcast') || 
         jid.includes('@newsletter') ||
         jid.includes('@newsletter.');
};

// Unwrap WhatsApp containers
const getMessageContent = (msg) => {
  if (!msg || !msg.message) return null;
  let m = msg.message;
  if (m.ephemeralMessage) m = m.ephemeralMessage.message;
  if (m.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
  if (m.viewOnceMessage) m = m.viewOnceMessage.message;
  if (m.documentWithCaptionMessage) m = m.documentWithCaptionMessage.message;
  return m;
};

// Cached group metadata getter
const getCachedGroupMetadata = async (sock, groupId) => {
  try {
    if (!groupId || !groupId.endsWith('@g.us')) return null;
    const cached = groupMetadataCache.get(groupId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
    const metadata = await sock.groupMetadata(groupId);
    groupMetadataCache.set(groupId, { data: metadata, timestamp: Date.now() });
    return metadata;
  } catch (error) {
    const cached = groupMetadataCache.get(groupId);
    return cached ? cached.data : null;
  }
};

const getLiveGroupMetadata = async (sock, groupId) => {
  try {
    const metadata = await sock.groupMetadata(groupId);
    groupMetadataCache.set(groupId, { data: metadata, timestamp: Date.now() });
    return metadata;
  } catch (error) {
    const cached = groupMetadataCache.get(groupId);
    return cached ? cached.data : null;
  }
};

const getGroupMetadata = getCachedGroupMetadata;

// Helper functions
const normalizeJid = (jid) => {
  if (!jid || typeof jid !== 'string') return null;
  return jid.includes(':') ? jid.split(':')[0] : jid.split('@')[0];
};

const getLidMappingValue = (user, direction) => {
  if (!user) return null;
  const sessionPath = path.join(__dirname, config.sessionName || 'session');
  const filePath = path.join(sessionPath, `lid-mapping-${user}${direction === 'pnToLid' ? '.json' : '_reverse.json'}`);
  if (!fs.existsSync(filePath)) return null;
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8').trim()); } catch { return null; }
};

const normalizeJidWithLid = (jid) => {
  if (!jid) return jid;
  try {
    const decoded = jidDecode(jid);
    let user = decoded?.user || jid.split(':')[0].split('@')[0];
    let server = decoded?.server === 'c.us' ? 's.whatsapp.net' : (decoded?.server || 's.whatsapp.net');
    return jidEncode(user, server);
  } catch { return jid; }
};

const buildComparableIds = (jid) => {
  if (!jid) return [jid];
  try {
    const decoded = jidDecode(jid);
    if (!decoded?.user) return [normalizeJidWithLid(jid)];
    const variants = new Set([jidEncode(decoded.user, decoded.server === 'c.us' ? 's.whatsapp.net' : decoded.server)]);
    return Array.from(variants);
  } catch { return [jid]; }
};

const findParticipant = (participants = [], userIds) => {
  const targets = (Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean);
  return participants.find(p => targets.includes(p.id)) || null;
};

const isOwner = (sender) => {
  const senderNumber = normalizeJid(normalizeJidWithLid(sender));
  return config.ownerNumber.some(owner => normalizeJid(normalizeJidWithLid(owner.includes('@') ? owner : `${owner}@s.whatsapp.net`)) === senderNumber);
};

const isMod = (sender) => database.isModerator(sender.split('@')[0]);

const isAdmin = async (sock, participant, groupId, groupMetadata = null) => {
  if (!groupId?.endsWith('@g.us')) return false;
  const meta = groupMetadata || await getLiveGroupMetadata(sock, groupId);
  const found = findParticipant(meta?.participants || [], participant);
  return found?.admin === 'admin' || found?.admin === 'superadmin';
};

const isBotAdmin = async (sock, groupId, groupMetadata = null) => {
  if (!groupId?.endsWith('@g.us')) return false;
  const meta = groupMetadata || await getLiveGroupMetadata(sock, groupId);
  const found = findParticipant(meta?.participants || [], sock.user.id);
  return found?.admin === 'admin' || found?.admin === 'superadmin';
};

// --- MAIN MESSAGE HANDLER ---
const handleMessage = async (sock, msg) => {
  try {
    const from = msg.key.remoteJid;

    // 1. Trigger Typing Simulation ONLY on incoming messages
    // This happens as soon as the message arrives (before processing begins)
    const typingdb = load();
    if (typingdb?.enabled && from && !msg.key.fromMe) {
      await sock.sendPresenceUpdate('composing', from);
    }

    if (!msg.message || isSystemJid(from)) return;

    // 2. Auto-React System
    try {
      delete require.cache[require.resolve('./config')];
      const currentConfig = require('./config');
      if (currentConfig.autoReact && !msg.key.fromMe) {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const mode = currentConfig.autoReactMode || 'bot';
        if (mode === 'bot' && ['.', '/', '#'].includes(text?.trim()[0])) {
          await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });
        } else if (mode === 'all') {
          const emojis = ['❤️','🔥','👌','💀','😁','✨','👍'];
          await sock.sendMessage(from, { react: { text: emojis[Math.floor(Math.random() * emojis.length)], key: msg.key } });
        }
      }
    } catch (e) { console.error('[AutoReact Error]', e.message); }

    const content = getMessageContent(msg);
    const sender = msg.key.participant || from;
    const isGroup = from.endsWith('@g.us');
    const groupMetadata = isGroup ? await getGroupMetadata(sock, from) : null;

    if (isGroup) {
      addMessage(from, sender);
      // Insert your original handleAntigroupmention logic here
    }

    if (!content) return;

    // 3. Button Response Logic
    const btn = content.buttonsResponseMessage;
    if (btn) {
      const cmdMap = { 'btn_menu': 'menu', 'btn_ping': 'ping', 'btn_help': 'list' };
      const cmdName = cmdMap[btn.selectedButtonId];
      if (cmdName && commands.has(cmdName)) {
        await commands.get(cmdName).execute(sock, msg, [], { from, sender, isGroup, groupMetadata, isOwner: isOwner(sender), isAdmin: await isAdmin(sock, sender, from, groupMetadata), isBotAdmin: await isBotAdmin(sock, from, groupMetadata), isMod: isMod(sender), reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }), react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }) });
        return;
      }
    }

    // 4. Command Execution Logic
    let body = content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption || content.videoMessage?.caption || '';
    body = body.trim();
    const prefix = body[0];
    
    if (['.', '/', '#'].includes(prefix)) {
      const args = body.split(/ +/).slice(1);
      const commandName = body.split(/ +/)[0].slice(1).toLowerCase();
      const command = commands.get(commandName);
      if (command) {
        await command.execute(sock, msg, args, { from, sender, isGroup, groupMetadata, isOwner: isOwner(sender), isAdmin: await isAdmin(sock, sender, from, groupMetadata), isBotAdmin: await isBotAdmin(sock, from, groupMetadata), isMod: isMod(sender), reply: (text) => sock.sendMessage(from, { text }, { quoted: msg }), react: (emoji) => sock.sendMessage(from, { react: { text: emoji, key: msg.key } }) });
      }
    }
    
    // Insert your original Anti-Tag and Anti-All logic here
    
  } catch (err) {
    console.error('[Handler Error]', err);
  }
};

const initializeAntiCall = async (sock) => {
  sock.ev.on('call', async (call) => {
    for (let c of call) {
      if (c.status === 'offer') {
        await sock.rejectCall(c.id, c.from);
        await sock.sendMessage(c.from, { text: '🚫 *AntiCall Active:* My bot does not accept calls.' });
      }
    }
  });
};

module.exports = { handleMessage, initializeAntiCall };