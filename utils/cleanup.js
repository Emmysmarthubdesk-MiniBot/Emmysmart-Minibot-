const fs = require('fs');
const path = require('path');

const startCleanup = () => {
    const tmpDir = path.join(__dirname, '../tmp');
    
    // Run cleanup automatically every 1 hour
    setInterval(() => {
        if (fs.existsSync(tmpDir)) {
            fs.readdir(tmpDir, (err, files) => {
                if (err) return;
                
                files.forEach(file => {
                    const filePath = path.join(tmpDir, file);
                    fs.stat(filePath, (err, stat) => {
                        if (err) return;
                        
                        const now = new Date().getTime();
                        // Delete files older than 1 hour (3600000 ms)
                        const endTime = new Date(stat.ctime).getTime() + 3600000; 
                        
                        if (now > endTime) {
                            fs.unlink(filePath, () => {}); // Silently delete
                        }
                    });
                });
            });
        }
    }, 60 * 60 * 1000); 
};

module.exports = { startCleanup };