// Tweet Analyzer
// Ranks and filters tweets to find the most viral

class TweetAnalyzer {
  constructor() {
    this.categories = [
      {
        name: 'tech',
        keywords: ['technology', 'tech', 'software', 'startup', 'coding', 'programming', 'developer', 'engineering']
      },
      {
        name: 'crypto',
        keywords: ['crypto', 'bitcoin', 'ethereum', 'btc', 'eth', 'blockchain', 'defi', 'nft', 'web3', 'altcoin']
      },
      {
        name: 'ai',
        keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'claude', 'openai', 'neural']
      }
    ];
  }

  getCategories() {
    return this.categories;
  }

  // Find top tweet for each category
  findTopTweets(categoryResults, topN = 3) {
    const topTweets = [];

    for (const [category, tweets] of Object.entries(categoryResults)) {
      if (!tweets || tweets.length === 0) continue;

      // Sort by engagement score (likes + 2*retweets)
      const sorted = [...tweets].sort((a, b) => b.engagementScore - a.engagementScore);
      
      // Take top N
      const categoryTop = sorted.slice(0, topN).map(tweet => ({
        ...tweet,
        category
      }));

      topTweets.push(...categoryTop);
    }

    // Re-sort all combined by engagement
    return topTweets
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, topN);
  }

  // Filter out low-quality tweets
  filterQualityTweets(tweets, minLikes = 50, minFollowers = 1000) {
    return tweets.filter(t => {
      // Skip tweets with very low engagement
      if (t.metrics.likes < minLikes) return false;
      
      // Skip tweets from very small accounts (might be bot/fake viral)
      if (t.author?.followers && t.author.followers < minFollowers) return false;
      
      // Skip tweets that are mostly URLs (usually spam/shilling)
      const urlCount = (t.text.match(/https?:\/\//g) || []).length;
      if (urlCount > 1) return false;
      
      return true;
    });
  }

  // Detect tweet category from content if not already tagged
  detectCategory(text) {
    const lower = text.toLowerCase();
    
    for (const cat of this.categories) {
      if (cat.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
        return cat.name;
      }
    }
    
    return 'general';
  }

  // Calculate viral velocity (would need historical data)
  // For now, just use engagement score as proxy
  calculateViralScore(tweet) {
    const metrics = tweet.metrics;
    const authorWeight = Math.log10(Math.max(tweet.author?.followers || 1000, 1000));
    
    // Engagement relative to follower count
    const engagementRate = (metrics.likes + metrics.retweets * 2) / authorWeight;
    
    return engagementRate;
  }
}

module.exports = TweetAnalyzer;
