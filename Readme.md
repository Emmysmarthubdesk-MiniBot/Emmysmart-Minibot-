<div align="center">

## Emmysmart Mini Bot

[![Made with Baileys](https://img.shields.io/badge/Made%20with-Baileys-00bcd4?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

<img src="utils/bot_image.jpg" alt="Emmysmart Mini Bot" width="260">

</div>

Emmysmart Mini Bot is a highly optimized, multi-device (MD) WhatsApp automation engine built on top of the **Baileys** library. 

Developed by **Emmysmart Hub**, this project features a lightweight, zero-lag modular handler system, making it incredibly easy to customize variables via `config.js` without altering primary execution threads.

---

## ✨ Features

- **A1 Formula Engine** – Runs Anti-Delete, Auto-Status, and Auto-React simultaneously without any feature interference.
- **Shazam Music Search** – Identifies song titles, artists, and album artwork directly from audio clips or voice notes.
- **Multi-Platform Downloader** – Downloads clean videos from TikTok (no watermark), Instagram Reels, and Facebook.
- **Public/Private Modes** – Instantly switch bot accessibility between public use and owner-only restriction.
- **Modular Command System** – Structured code architecture via clean handlers for effortless customization.
- **Storage Optimization** – Automated background cache clearing and temporary media file trimming to save disk space.

---

### 1. Fork the Repository

<div align="center">

<a href="https://github.com/your-username/Emmysmart-Mini-Bot/fork" target="_blank">
  <img src="https://img.shields.io/badge/Fork%20Repository-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="Fork on GitHub">
</a>

</div>

> This copies the repository source files over to your personal GitHub account for staging.

---

### 2. Choose Your Deployment Panel

#### Option A: Deploy on Pterodactyl Panel (Recommended)
<div align="center">

<a href="YOUR_PTERODACTYL_PANEL_URL_HERE" target="_blank">
  <img src="https://img.shields.io/badge/Deploy%20on-Pterodactyl-blue?style=for-the-badge&logo=pterodactyl&logoColor=white" alt="Deploy on Pterodactyl">
</a>

</div>

#### Option B: Deploy on Katabump
<div align="center">

<a href="https://dashboard.katabump.com/auth/login#d6b7d6" target="_blank">
  <img src="https://img.shields.io/badge/Deploy%20on-Katabump-orange?style=for-the-badge" alt="Deploy on Katabump">
</a>

</div>

> **💡 Connection Step:** Once your server node spins up on your dashboard panel, open your startup console. The script will safely prompt you to insert your WhatsApp phone number to establish a link via a unique pairing code or authorization password.

For a full contextual walkthrough regarding panel variables and deployment configurations, check out the video guide below:

<div align="center">
  <a href="https://youtu.be/4PQcn-qqrcE">
    <img src="https://img.shields.io/badge/Deploy Tutorial-dc3545?style=for-the-badge&logo=youtube" alt="YouTube Link"/>
  </a>
</div>

---

## 🛠 Local Setup

### 1️⃣ Clone the workspace files
```bash
git clone [https://github.com/your-username/Emmysmart-Mini-Bot.git](https://github.com/your-username/Emmysmart-Mini-Bot.git)
cd Emmysmart-Mini-Bot

2️⃣ Populate project dependencies
Bash
npm install

3️⃣ Run the application
Bash
node index.js

4️⃣ Authenticate via Phone Pairing Code
When the app executes inside your console:

The terminal instance will prompt you to type in your connected WhatsApp account phone number (with international country code prefix).

The terminal will generate a unique 8-character Pairing Code / Password.

Open WhatsApp on your device, navigate to Linked Devices -> Link with Phone Number, and input the terminal generated string to link your account securely.

🙏 Credits
Emmysmart Hub – Principal System Architect & Lead Bot Developer

Baileys – Multi-Device WhatsApp Web API library Engine (@whiskeysockets/baileys)

Additional external libraries found inside package.json

📢 Mandatory Attribution Notice
⚠️ IMPORTANT: This project is fully open-source, but proper credit must be given to the original owner. If you use, modify, fork, or rebrand this codebase for your own bot distribution, you MUST retain the original developer credits pointing to Emmysmart Hub inside your repository, video descriptions, and bot menus. Removing author tags without permission is strictly prohibited.

⚠️ Important Warning
1 This automation tool is engineered strictly for utility and educational implementations.

2 This tool is not an authorized or official product of WhatsApp Inc.

3 Operating unofficial client scripts can conflict with WhatsApp’s Acceptable Use Policies and can introduce risks of service limitations or profile suspension.

4 You initialize this software entirely at your own risk. The developers hold zero responsibility or liability for messaging restrictions, configuration errors, or data blocks encountered during runtime.

📄 License (MIT)
This automation project is licensed under the MIT License.

You must:

• Manage this codebase in strict compliance with your local communication regulations.

• Retain clear author recognition references and licensing layouts across distributed versions.

• Avoid using this code to operate heavy communication loops, malicious text schemes, or server spam behaviors.

📜 Copyright Notice
Copyright (c) 2026 Emmysmart Hub.

All rights reserved.
