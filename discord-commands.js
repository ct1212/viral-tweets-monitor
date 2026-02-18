// Discord Command Listener for Viral Tweets Monitor
// Watches #general for !viral commands

const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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
    this.monitorChannel = '1468146637317603455'; // #general
  }

  async start() {
    this.client.on('ready', () => {
      console.log(`[discord-cmd] Listening for commands as ${this.client.user.tag}`);
    });

    this.client.on('messageCreate', async (message) => {
      // Only listen in #general
      if (message.channelId !== this.monitorChannel) return;
      
      // Ignore own messages
      if (message.author.bot) return;

      const content = message.content.toLowerCase().trim();

      // Check for viral commands
      if (content === '!viral on' || content === 'enable' || content === 'ENABLE') {
        await this.enableMonitor(message);
      }
      else if (content === '!viral off' || content === 'disable' || content === 'DISABLE') {
        await this.disableMonitor(message);
      }
      else if (content === '!viral status' || content === 'status') {
        await this.checkStatus(message);
      }
      else if (content === '!viral test' || content === 'test') {
        await this.runTest(message);
      }
    });

    await this.client.login(this.botToken);
  }

  async enableMonitor(message) {
    try {
      await fs.writeFile('/home/agent/.openclaw/viral-tweets-monitor.status', 'enabled');
      await message.reply('✅ Viral tweets monitor **ENABLED**. Will run during active hours (7am-11am Bangkok).');
      console.log(`[discord-cmd] Monitor enabled by ${message.author.username}`);
    } catch (err) {
      await message.reply('❌ Error enabling monitor: ' + err.message);
    }
  }

  async disableMonitor(message) {
    try {
      await fs.writeFile('/home/agent/.openclaw/viral-tweets-monitor.status', 'disabled');
      await message.reply('⏹️ Viral tweets monitor **DISABLED**. Use `!viral on` to re-enable.');
      console.log(`[discord-cmd] Monitor disabled by ${message.author.username}`);
    } catch (err) {
      await message.reply('❌ Error disabling monitor: ' + err.message);
    }
  }

  async checkStatus(message) {
    try {
      const status = await fs.readFile('/home/agent/.openclaw/viral-tweets-monitor.status', 'utf8');
      const emoji = status.trim() === 'enabled' ? '✅' : '⏹️';
      await message.reply(`${emoji} Viral tweets monitor is **${status.trim().toUpperCase()}**`);
    } catch {
      await message.reply('⏹️ Viral tweets monitor is **DISABLED** (no status file)');
    }
  }

  async runTest(message) {
    await message.reply('🧪 Running test scan now...');
    try {
      const { stdout, stderr } = await execAsync('cd /home/agent/projects/viral-tweets-monitor && node index.js', { timeout: 60000 });
      console.log('[discord-cmd] Test output:', stdout);
      if (stderr) console.error('[discord-cmd] Test stderr:', stderr);
      await message.reply('✅ Test complete! Check #viral-tweets for results.');
    } catch (err) {
      await message.reply('❌ Test failed: ' + err.message);
      console.error('[discord-cmd] Test error:', err);
    }
  }
}

// Start if run directly
if (require.main === module) {
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!botToken) {
    console.error('Error: DISCORD_BOT_TOKEN not set');
    process.exit(1);
  }
  
  const listener = new DiscordCommandListener(botToken);
  listener.start().catch(console.error);
}

module.exports = DiscordCommandListener;
