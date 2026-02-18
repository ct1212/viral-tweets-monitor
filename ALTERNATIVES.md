# Free Alternatives to X API ($100/month)

## Option 1: Nitter (Scraper)
- Free, open-source Twitter frontend
- Scrapes public data without API
- Multiple instances: nitter.net, nitter.cz, nitter.it
- **Risk:** Against X ToS, instances get blocked

## Option 2: X API Free Tier
- Read-only access
- 500 tweets/month limit
- No search, only timeline
- **Too limited for viral monitoring**

## Option 3: Reddit API (FREE)
- 100 queries/minute free tier
- Crypto discussions: r/CryptoCurrency, r/ethtrader, etc.
- Real engagement data (upvotes, comments)
- **Viable alternative**

## Option 4: Web Scraping (Headless)
- Puppeteer/Playwright scrape X
- More work, more fragile
- **Doable but maintenance heavy**

## Option 5: News Aggregators
- CryptoPanic API (free tier)
- CoinGecko social data
- LunarCrush (free tier)
- **Good for trending topics**

## Recommendation: Hybrid Approach

**Primary:** Reddit API
- r/CryptoCurrency (6.8M members)
- r/ethfinance, r/ethtrader
- r/Chainlink (for LINK-specific)

**Secondary:** LunarCrush or CryptoPanic
- Track social sentiment
- Identify trending coins

**Implementation:**
- Monitor Reddit posts by engagement (upvotes + comments)
- Use xAI/Grok to generate replies same way
- Post to Discord same format

Want me to build the Reddit-based version?
