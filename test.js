// Quick test script - validates setup without posting to Discord
const fs = require('fs');
const path = require('path');

const XClient = require('./lib/x-client');
const TweetAnalyzer = require('./lib/analyzer');

function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found');
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

async function test() {
  console.log('🧪 Testing X API connection...\n');
  
  loadEnv();
  
  if (!process.env.X_BEARER_TOKEN || process.env.X_BEARER_TOKEN === 'your_x_bearer_token_here') {
    console.error('❌ X_BEARER_TOKEN not set in .env.local');
    process.exit(1);
  }

  const xClient = new XClient(process.env.X_BEARER_TOKEN);
  const analyzer = new TweetAnalyzer();

  try {
    // Test fetching just AI tweets
    console.log('Fetching AI tweets...');
    const categories = [{ name: 'ai', keywords: ['ai', 'artificial intelligence'] }];
    const results = await xClient.fetchCategoryTweets(categories, 5);
    
    console.log(`✅ Fetched ${results.ai?.length || 0} tweets\n`);
    
    if (results.ai && results.ai.length > 0) {
      const top = results.ai[0];
      console.log('Sample tweet:');
      console.log(`  Author: @${top.author?.username}`);
      console.log(`  Text: ${top.text.substring(0, 100)}...`);
      console.log(`  Likes: ${top.metrics.likes}, RTs: ${top.metrics.retweets}`);
      console.log(`  Engagement Score: ${top.engagementScore}`);
    }

    console.log('\n✅ X API test passed!');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
  }
}

test();
