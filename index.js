#!/usr/bin/env node
// Viral Tweets Monitor - Main Orchestrator
// Runs hourly to fetch, analyze, and post viral tweets

const fs = require('fs');
const path = require('path');

const XClient = require('./lib/x-client');
const XAIClient = require('./lib/xai-client');
const DiscordPoster = require('./lib/discord-poster');
const TweetAnalyzer = require('./lib/analyzer');

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
      console.log(`Viral tweets monitor is ${status}. Set to 'enabled' to run.`);
      console.log(`Run: node control.js on`);
      return;
    }

  console.log('🚀 Starting Viral Tweets Monitor...\n');

  // Load env
  loadEnv();

  // Validate required env vars
  const required = ['X_BEARER_TOKEN', 'XAI_API_KEY', 'DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Initialize clients
  const xClient = new XClient(process.env.X_BEARER_TOKEN);
  const xaiClient = new XAIClient(process.env.XAI_API_KEY);
  const discord = new DiscordPoster(
    process.env.DISCORD_BOT_TOKEN,
    process.env.DISCORD_CHANNEL_ID
  );
  const analyzer = new TweetAnalyzer();

  try {
    // Connect to Discord
    console.log('Connecting to Discord...');
    await discord.connect();

    // Get current time
    const now = new Date();
    const utcHour = now.getUTCHours();
    const bangkokHour = (utcHour + 7) % 24;
    const bangkokTime = `${bangkokHour.toString().padStart(2, '0')}:00`;

    // Check if within active hours (7am-11am Bangkok = 00:00-04:00 UTC)
    // Bypass if START command used (BYPASS_TIME_CHECK env var)
    if (!process.env.BYPASS_TIME_CHECK && utcHour > 4) {
      console.log(`Outside active hours (Bangkok ${bangkokTime}). Skipping.`);
      console.log(`Use 'START' command in Discord to run outside hours.`);
      await discord.disconnect();
      return;
    }

    // Post header
    await discord.postHeader(utcHour, bangkokTime);

    // Fetch tweets for each category
    console.log('Fetching tweets from X API...');
    const categories = analyzer.getCategories();
    // Fetch 30 per category (90 total per run). Basic tier = 10K tweets/month.
    // 90 tweets * 5 runs/day * 30 days = 13,500 — keep an eye on usage.
    const tweetsByCategory = await xClient.fetchCategoryTweets(categories, 30);

    // Analyze and find top tweets
    console.log('Analyzing engagement...');
    const allTweets = [];
    
    for (const [category, tweets] of Object.entries(tweetsByCategory)) {
      console.log(`  ${category}: ${tweets.length} tweets fetched`);
      
      // Filter for quality (lowered thresholds for testing)
      const qualityTweets = analyzer.filterQualityTweets(tweets, 10, 100);
      console.log(`    ${qualityTweets.length} after quality filter`);
      
      // Sort by engagement and take top 1 per category for final selection
      const topInCategory = qualityTweets
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, 1);
      
      allTweets.push(...topInCategory.map(t => ({ ...t, category })));
    }

    // Sort all combined and take top 3
    const top3 = allTweets
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 3);

    if (top3.length === 0) {
      console.log('No viral tweets found this hour.');
      await discord.postNoTweetsMessage();
      await discord.disconnect();
      return;
    }

    console.log(`\nTop 3 tweets selected. Generating reply suggestions...\n`);

    // Process each top tweet
    for (const tweet of top3) {
      console.log(`Processing: ${tweet.author?.username || 'unknown'} - ${tweet.text.substring(0, 50)}...`);
      
      // Generate reply suggestions (using @chainlinkp style)
      const replyStyle = process.env.REPLY_STYLE || 'chainlinkp';
      const replies = await xaiClient.generateReplySuggestions(tweet, replyStyle);
      console.log(`  Generated ${replies.length} reply suggestions`);

      // Post to Discord
      await discord.postReport(tweet.category, tweet, replies);
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
