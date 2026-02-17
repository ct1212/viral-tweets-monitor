# Viral Tweets Monitor

Monitors X (Twitter) for trending tech, crypto, and AI tweets. Posts top 3 per hour with thoughtful reply suggestions.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add API keys to `.env.local`:
```
X_BEARER_TOKEN=your_x_api_bearer_token
XAI_API_KEY=your_xai_api_key
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_CHANNEL_ID=1473207643979120742
```

3. Test manually:
```bash
node index.js
```

4. Deploy to cron (runs hourly 7am-11am Bangkok / 00:00-04:00 UTC):
```bash
# This will be set up via OpenClaw cron
```

## How It Works

1. Fetches tweets from X API (search recent) for categories: tech, crypto, AI
2. Ranks by engagement (likes + retweets) — cheapest metric
3. Uses xAI (Grok) to generate 3 thoughtful reply options per tweet
4. Posts formatted report to Discord #viral-tweets channel

## Files

- `index.js` — Main orchestrator
- `lib/x-client.js` — X API client
- `lib/xai-client.js` — xAI/Grok client  
- `lib/discord-poster.js` — Discord posting
- `lib/analyzer.js` — Tweet ranking & filtering
