const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../database/antidelete.json');

function initializeFile() {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({ enabled: true, statusEnabled: false }, null, 2));
  }
}

function load() {
  initializeFile();
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { enabled: true, statusEnabled: false };
  }
}

function save(config) {
  initializeFile();
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
}

module.exports = { load, save };
