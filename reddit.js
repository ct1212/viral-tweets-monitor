#!/usr/bin/env node
// Viral Reddit Monitor - Main Orchestrator
// Uses FREE Reddit API instead of $100/month X API

const fs = require('fs');
const path = require('path');

const RedditClient = require('./lib/reddit-client');
const XAIClient = require('./lib/xai-client');
const DiscordPoster = require('./lib/discord-reddit');

// Load environment variables
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('Error: .env.local not found. Create it from README.md instructions.');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

async function main() {
  // Check if monitor is enabled
  const statusFile = '/home/agent/.openclaw/viral-tweets-monitor.status';
  let status = 'disabled';
  try {
    status = fs.readFileSync(statusFile, 'utf8').trim();
  } catch {
    // Default to disabled if file doesn't exist
  }

  if (status !== 'enabled') {
    console.log(`Viral monitor is ${status}. Set to 'enabled' to run.`);
    console.log(`Run: node control.js on`);
    return;
  }

  console.log('🚀 Starting Viral Reddit Monitor (FREE)...\n');

  // Load env
  loadEnv();

  // Validate required env vars
  const required = ['XAI_API_KEY', 'DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Initialize clients
  const reddit = new RedditClient();
  const xaiClient = new XAIClient(process.env.XAI_API_KEY);
  const discord = new DiscordPoster(
    process.env.DISCORD_BOT_TOKEN,
    process.env.DISCORD_CHANNEL_ID
  );

  try {
    // Connect to Discord
    console.log('Connecting to Discord...');
    await discord.connect();

    // Get current time
    const now = new Date();
    const utcHour = now.getUTCHours();
    const bangkokHour = (utcHour + 7) % 24;
    const bangkokTime = `${bangkokHour.toString().padStart(2, '0')}:00`;

    // Post header
    await discord.postHeader(utcHour, bangkokTime);

    // Fetch viral posts from Reddit
    console.log('Fetching viral posts from Reddit...');
    const topPosts = await reddit.fetchCryptoViral(9);

    if (topPosts.length === 0) {
      console.log('No viral posts found this hour.');
      await discord.disconnect();
      return;
    }

    console.log(`\nTop ${topPosts.length} posts selected. Generating reply suggestions...\n`);

    // Process top 3 posts
    const top3 = topPosts.slice(0, 3);
    
    for (const post of top3) {
      console.log(`Processing: r/${post.subreddit} - ${post.title.substring(0, 50)}...`);
      console.log(`  Viral score: ${post.viralScore.toLocaleString()} (upvotes: ${post.metrics.upvotes}, comments: ${post.metrics.comments})`);
      
      // Generate reply suggestions
      const replies = await xaiClient.generateReplySuggestions({
        text: post.title + (post.text ? '\n\n' + post.text : ''),
        author: { username: post.author },
        metrics: { likes: post.metrics.upvotes, retweets: 0 }
      });
      
      console.log(`  Generated ${replies.length} reply suggestions`);

      // Post to Discord
      await discord.postRedditReport(post, replies);
      console.log(`  Posted to Discord\n`);

      // Small delay between posts
      await new Promise(r => setTimeout(r, 1000));
    }

    // Post footer
    await discord.postFooter();
    console.log('✅ Report complete!');

  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await discord.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
