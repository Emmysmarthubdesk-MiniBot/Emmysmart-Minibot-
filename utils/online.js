const fs = require('fs');
const path = require('path');
const dbpath = path.join(__dirname, '../database/online.json');

// Ensure the directory exists before attempting to read/write
const dbDir = path.dirname(dbpath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const load = () => {
  // If file doesn't exist, create it with the default 'disabled' state
  if (!fs.existsSync(dbpath)) {
    const defaultData = { enabled: false };
    fs.writeFileSync(dbpath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  
  try {
    return JSON.parse(fs.readFileSync(dbpath, 'utf-8'));
  } catch (err) {
    return { enabled: false };
  }
};

const save = (data) => {
  fs.writeFileSync(dbpath, JSON.stringify(data, null, 2));
};

module.exports = { load, save };