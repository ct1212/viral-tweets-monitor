#!/usr/bin/env node
// Weekly progress report poster
// Runs Sundays and posts to Discord

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const MetricsDashboard = require('./lib/metrics-dashboard');
const ReplyTracker = require('./lib/reply-tracker');
const XClient = require('./lib/x-client');

require('dotenv').config({ path: './.env.local' });

const CHANNEL_ID = '1473207643979120742'; // #viral-tweets

async function postWeeklyReport() {
  console.log('📊 Generating weekly report...');
  
  const xClient = new XClient(process.env.X_BEARER_TOKEN);
  const dash = new MetricsDashboard(xClient);
  const tracker = new ReplyTracker(xClient);
  
  // Generate reports
  const growthReport = await dash.generateReport();
  const replyReport = await tracker.generateReport();
  const chart = await dash.generateChart();
  
  // Connect to Discord
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  await client.login(process.env.DISCORD_BOT_TOKEN);
  
  const channel = await client.channels.fetch(CHANNEL_ID);
  
  // Build embed
  const embed = new EmbedBuilder()
    .setColor(growthReport.status.includes('🚀') ? 0x22c55e : 
              growthReport.status.includes('✅') ? 0x3b82f6 : 
              growthReport.status.includes('⚠️') ? 0xf59e0b : 0xef4444)
    .setTitle('📈 Weekly @chainlinkp Progress Report')
    .setDescription(`Week of ${new Date().toLocaleDateString()}`)
    .addFields(
      { 
        name: '🎯 Progress to 5M', 
        value: growthReport.progress.toGoal, 
        inline: true 
      },
      { 
        name: '📊 Current Impressions', 
        value: growthReport.current.impressions, 
        inline: true 
      },
      { 
        name: '👥 Followers', 
        value: growthReport.current.followers, 
        inline: true 
      },
      { 
        name: '⚡ Status', 
        value: growthReport.status, 
        inline: false 
      },
      { 
        name: '📝 Replies This Week', 
        value: replyReport.totalReplies?.toString() || 'No data', 
        inline: true 
      },
      { 
        name: '❤️ Avg Likes/Reply', 
        value: replyReport.avgLikes?.toString() || 'N/A', 
        inline: true 
      }
    )
    .setFooter({ text: 'The Department of Quietly Getting Things Done' })
    .setTimestamp();
  
  // Post
  await channel.send({ embeds: [embed] });
  await channel.send(chart);
  
  console.log('✅ Weekly report posted to Discord');
  await client.destroy();
}

postWeeklyReport().catch(err => {
  console.error('Error posting report:', err);
  process.exit(1);
});
