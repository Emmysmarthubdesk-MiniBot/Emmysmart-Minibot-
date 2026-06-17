const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/contacts.json');

function initializeFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ autoSaveContacts: false }, null, 2));
  }
}

function load() {
  initializeFile();
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { autoSaveContacts: false };
  }
}

function save(config) {
  initializeFile();
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
}

module.exports = { load, save };