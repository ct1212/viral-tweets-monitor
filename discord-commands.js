// Discord Command Listener for Viral Tweets Monitor
// Simple commands: STATUS, START, STOP

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Load .env.local
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fsSync.existsSync(envPath)) {
    console.error('Error: .env.local not found.');
    process.exit(1);
  }
  const envContent = fsSync.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const STATUS_FILE = '/home/agent/.openclaw/viral-tweets-monitor.status';
const MONITOR_CHANNEL = '1473207643979120742'; // #viral-tweets

class DiscordCommandListener {
  constructor(botToken) {
    this.botToken = botToken;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
  }

  async start() {
    this.client.on('ready', () => {
      console.log(`[viral-monitor] Command listener ready as ${this.client.user.tag}`);
    });

    this.client.on('messageCreate', async (message) => {
      // Only listen in #viral-tweets
      if (message.channelId !== MONITOR_CHANNEL) return;
      
      // Ignore own messages
      if (message.author.bot) return;

      const content = message.content.toUpperCase().trim();

      // Simple command matching
      if (content === 'STATUS') {
        await this.checkStatus(message);
      }
      else if (content === 'START') {
        await this.startMonitor(message);
      }
      else if (content === 'STOP') {
        await this.stopMonitor(message);
      }
    });

    await this.client.login(this.botToken);
  }

  async getStatus() {
    try {
      const status = await fs.readFile(STATUS_FILE, 'utf8');
      return status.trim();
    } catch {
      return 'disabled';
    }
  }

  async setStatus(status) {
    await fs.writeFile(STATUS_FILE, status);
  }

  async checkStatus(message) {
    const status = await this.getStatus();
    const emoji = status === 'enabled' ? '🟢' : '🔴';
    await message.reply(`${emoji} Viral tweets monitor is **${status.toUpperCase()}**`);
  }

  async startMonitor(message) {
    try {
      await this.setStatus('enabled');
      await message.reply('🟢 Viral tweets monitor **STARTED**');
      console.log(`[viral-monitor] Started by ${message.author.username}`);
      
      // Run immediately (bypass time check)
      await message.reply('⏳ Running scan now...');
      
      try {
        const { stdout } = await execAsync(
          'cd /home/agent/projects/viral-tweets-monitor && node index.js',
          { timeout: 120000, env: { ...process.env, BYPASS_TIME_CHECK: '1' } }
        );
        console.log('[viral-monitor] Scan complete:', stdout);
        await message.reply('✅ Scan complete! Check #viral-tweets');
      } catch (err) {
        console.error('[viral-monitor] Scan error:', err);
        await message.reply('⚠️ Scan finished with errors. Check logs.');
      }
    } catch (err) {
      await message.reply('❌ Error: ' + err.message);
    }
  }

  async stopMonitor(message) {
    try {
      await this.setStatus('disabled');
      await message.reply('🔴 Viral tweets monitor **STOPPED**');
      console.log(`[viral-monitor] Stopped by ${message.author.username}`);
    } catch (err) {
      await message.reply('❌ Error: ' + err.message);
    }
  }
}

// Start if run directly
if (require.main === module) {
  loadEnv();
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error('Error: DISCORD_BOT_TOKEN not set in .env.local');
    process.exit(1);
  }

  const listener = new DiscordCommandListener(botToken);
  listener.start().catch(console.error);
}

module.exports = DiscordCommandListener;
