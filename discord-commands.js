// Discord Command Listener for Viral Tweets Monitor
// Interactive buttons for START, STOP, STATUS

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const MONITOR_CHANNEL = '1473207643979120742'; // #viral-tweets
const STATUS_FILE = '/home/agent/.openclaw/viral-tweets-monitor.status';

class ViralMonitorDiscordBot {
  constructor(botToken) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });
    this.token = botToken;
  }

  async start() {
    this.setupHandlers();
    
    // Wait for ready event before posting
    this.client.once('ready', async () => {
      console.log(`[viral-monitor] Discord bot ready as ${this.client.user.tag}`);
      // Post initial status with buttons after ready
      await this.postStatusWithButtons();
    });
    
    await this.client.login(this.token);
  }

  setupHandlers() {
    // Ready event
    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user.tag}`);
    });

    // Message handler (for text commands as fallback)
    this.client.on('messageCreate', async (message) => {
      if (message.channelId !== MONITOR_CHANNEL) return;
      if (message.author.bot) return;

      const content = message.content.toUpperCase().trim();

      if (content === 'STATUS') {
        await this.handleStatus(message);
      }
      // Text commands still work as fallback
      else if (content === 'START') {
        await this.handleStart(message);
      }
      else if (content === 'STOP') {
        await this.handleStop(message);
      }
    });

    // Button interactions
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;
      if (interaction.channelId !== MONITOR_CHANNEL) return;

      await this.handleButton(interaction);
    });
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

  async handleStart(source) {
    try {
      await this.setStatus('enabled');
      
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle('🟢 Viral Tweets Monitor Started')
        .setDescription('The monitor is now active and will run during scheduled hours.')
        .addFields(
          { name: 'Status', value: 'ENABLED', inline: true },
          { name: 'Active Hours', value: '7am-11am Bangkok', inline: true },
          { name: 'Next Run', value: 'Scheduled automatically', inline: true }
        )
        .setTimestamp();

      if (source.reply) {
        await source.reply({ embeds: [embed] });
      } else {
        await source.channel.send({ embeds: [embed] });
      }

      console.log(`[viral-monitor] Started by ${source.user?.username || 'user'}`);

      // Run immediately
      await this.runScan(source);

    } catch (err) {
      console.error('[viral-monitor] Start error:', err);
      const errorMsg = { content: '❌ Error starting monitor: ' + err.message, ephemeral: true };
      if (source.reply) await source.reply(errorMsg);
    }
  }

  async handleStop(source) {
    try {
      await this.setStatus('disabled');
      
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('🔴 Viral Tweets Monitor Stopped')
        .setDescription('The monitor is now disabled. No automatic scans will run.')
        .addFields(
          { name: 'Status', value: 'DISABLED', inline: true },
          { name: 'To Resume', value: 'Click START button', inline: true }
        )
        .setTimestamp();

      if (source.reply) {
        await source.reply({ embeds: [embed] });
      } else {
        await source.channel.send({ embeds: [embed] });
      }

      console.log(`[viral-monitor] Stopped by ${source.user?.username || 'user'}`);

    } catch (err) {
      console.error('[viral-monitor] Stop error:', err);
      const errorMsg = { content: '❌ Error stopping monitor: ' + err.message, ephemeral: true };
      if (source.reply) await source.reply(errorMsg);
    }
  }

  async handleStatus(source) {
    const status = await this.getStatus();
    const isEnabled = status === 'enabled';
    
    const embed = new EmbedBuilder()
      .setColor(isEnabled ? 0x22c55e : 0x6b7280)
      .setTitle(isEnabled ? '🟢 Monitor Status: ACTIVE' : '⚪ Monitor Status: INACTIVE')
      .addFields(
        { name: 'Status', value: isEnabled ? 'ENABLED ✅' : 'DISABLED', inline: true },
        { name: 'Active Hours', value: '7am-11am Bangkok (00:00-04:00 UTC)', inline: true },
        { name: 'Channel', value: '<#1473207643979120742>', inline: true }
      )
      .setFooter({ text: 'Use buttons below to control the monitor' })
      .setTimestamp();

    // Create buttons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('start_monitor')
          .setLabel('START')
          .setStyle(ButtonStyle.Success)
          .setDisabled(isEnabled),
        new ButtonBuilder()
          .setCustomId('stop_monitor')
          .setLabel('STOP')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(!isEnabled),
        new ButtonBuilder()
          .setCustomId('run_now')
          .setLabel('RUN NOW')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(false),
        new ButtonBuilder()
          .setCustomId('status_check')
          .setLabel('REFRESH')
          .setStyle(ButtonStyle.Secondary)
      );

    if (source.reply) {
      await source.reply({ embeds: [embed], components: [row] });
    } else {
      await source.channel.send({ embeds: [embed], components: [row] });
    }
  }

  async handleButton(interaction) {
    const customId = interaction.customId;

    await interaction.deferReply({ ephemeral: true });

    switch (customId) {
      case 'start_monitor':
        await this.handleStart(interaction);
        // Update the message with new button states
        await this.updateButtonMessage(interaction.message, true);
        break;
        
      case 'stop_monitor':
        await this.handleStop(interaction);
        await this.updateButtonMessage(interaction.message, false);
        break;
        
      case 'run_now':
        await interaction.editReply({ content: '⏳ Running scan now...' });
        await this.runScan(interaction);
        break;
        
      case 'status_check':
        await interaction.deleteReply();
        await this.handleStatus({ channel: interaction.channel });
        break;
        
      default:
        await interaction.editReply({ content: 'Unknown button' });
    }
  }

  async updateButtonMessage(message, isEnabled) {
    try {
      const embed = new EmbedBuilder()
        .setColor(isEnabled ? 0x22c55e : 0x6b7280)
        .setTitle(isEnabled ? '🟢 Monitor Status: ACTIVE' : '⚪ Monitor Status: INACTIVE')
        .addFields(
          { name: 'Status', value: isEnabled ? 'ENABLED ✅' : 'DISABLED', inline: true },
          { name: 'Active Hours', value: '7am-11am Bangkok (00:00-04:00 UTC)', inline: true },
          { name: 'Channel', value: '<#1473207643979120742>', inline: true }
        )
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('start_monitor')
            .setLabel('START')
            .setStyle(ButtonStyle.Success)
            .setDisabled(isEnabled),
          new ButtonBuilder()
            .setCustomId('stop_monitor')
            .setLabel('STOP')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!isEnabled),
          new ButtonBuilder()
            .setCustomId('run_now')
            .setLabel('RUN NOW')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('status_check')
            .setLabel('REFRESH')
            .setStyle(ButtonStyle.Secondary)
        );

      await message.edit({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  }

  async runScan(source) {
    try {
      const { stdout, stderr } = await execAsync(
        'cd /home/agent/projects/social/viral-tweets-monitor && BYPASS_TIME_CHECK=1 node index.js',
        { timeout: 120000, env: { ...process.env, BYPASS_TIME_CHECK: '1' } }
      );

      console.log('[viral-monitor] Scan complete:', stdout);
      
      if (stderr) console.error('[viral-monitor] Scan stderr:', stderr);

      const embed = new EmbedBuilder()
        .setColor(0x3b82f6)
        .setTitle('✅ Scan Complete')
        .setDescription('Check #viral-tweets for results.')
        .setTimestamp();

      if (source.channel) {
        await source.channel.send({ embeds: [embed] });
      }

    } catch (err) {
      console.error('[viral-monitor] Scan error:', err);
      
      const embed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle('❌ Scan Error')
        .setDescription(err.message)
        .setTimestamp();

      if (source.channel) {
        await source.channel.send({ embeds: [embed] });
      }
    }
  }

  async postStatusWithButtons() {
    try {
      const channel = await this.client.channels.fetch(MONITOR_CHANNEL);
      const status = await this.getStatus();
      const isEnabled = status === 'enabled';

      const embed = new EmbedBuilder()
        .setColor(isEnabled ? 0x22c55e : 0x6b7280)
        .setTitle('🎯 Viral Tweets Monitor')
        .setDescription('Control panel for the @chainlinkp growth monitor')
        .addFields(
          { name: 'Status', value: isEnabled ? '🟢 ENABLED' : '⚪ DISABLED', inline: true },
          { name: 'Active Hours', value: '7am-11am Bangkok', inline: true },
          { name: 'Function', value: 'Monitors viral tweets for reply opportunities', inline: false }
        )
        .setFooter({ text: 'Click buttons below to control' })
        .setTimestamp();

      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('start_monitor')
            .setLabel('START')
            .setStyle(ButtonStyle.Success)
            .setDisabled(isEnabled),
          new ButtonBuilder()
            .setCustomId('stop_monitor')
            .setLabel('STOP')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(!isEnabled),
          new ButtonBuilder()
            .setCustomId('run_now')
            .setLabel('RUN NOW')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('status_check')
            .setLabel('REFRESH')
            .setStyle(ButtonStyle.Secondary)
        );

      await channel.send({ embeds: [embed], components: [row] });
      console.log('[viral-monitor] Posted control panel with buttons');

    } catch (err) {
      console.error('[viral-monitor] Failed to post status:', err);
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

  const bot = new ViralMonitorDiscordBot(botToken);
  bot.start().catch(console.error);
}

module.exports = ViralMonitorDiscordBot;
