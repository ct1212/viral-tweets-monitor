// X (Twitter) API v2 Client
// Uses Bearer Token authentication

class XClient {
  constructor(bearerToken) {
    this.bearerToken = bearerToken;
    this.baseUrl = 'https://api.twitter.com/2';
  }

  async searchRecentTweets(query, maxResults = 10) {
    // Search recent tweets (last 7 days)
    // Requires X API Basic tier or higher for search
    const url = new URL(`${this.baseUrl}/tweets/search/recent`);
    url.searchParams.append('query', query);
    url.searchParams.append('max_results', Math.min(maxResults, 100).toString());
    url.searchParams.append('tweet.fields', 'public_metrics,author_id,created_at,context_annotations');
    url.searchParams.append('expansions', 'author_id');
    url.searchParams.append('user.fields', 'username,public_metrics,verified');
    url.searchParams.append('sort_order', 'relevancy');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`X API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return this.formatTweets(data);
  }

  formatTweets(data) {
    const tweets = data.data || [];
    const users = data.includes?.users || [];
    
    const userMap = new Map(users.map(u => [u.id, u]));

    return tweets.map(tweet => {
      const author = userMap.get(tweet.author_id);
      const metrics = tweet.public_metrics || {};
      
      return {
        id: tweet.id,
        text: tweet.text,
        url: `https://twitter.com/${author?.username || 'user'}/status/${tweet.id}`,
        createdAt: tweet.created_at,
        author: author ? {
          id: author.id,
          name: author.name,
          username: author.username,
          verified: author.verified || false,
          followers: author.public_metrics?.followers_count || 0
        } : null,
        metrics: {
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          replies: metrics.reply_count || 0,
          quotes: metrics.quote_count || 0,
          impressions: metrics.impression_count || 0
        },
        // Simple engagement score for ranking
        engagementScore: (metrics.like_count || 0) + (metrics.retweet_count || 0) * 2
      };
    });
  }

  // Fetch tweets for multiple categories
  async fetchCategoryTweets(categories, tweetsPerCategory = 10) {
    const results = {};
    
    for (const category of categories) {
      try {
        // Build query with engagement filter and language
        // -is:reply -is:retweet filters out replies and pure RTs
        const query = `(${category.keywords.join(' OR ')}) -is:reply -is:retweet lang:en`;
        
        const tweets = await this.searchRecentTweets(query, tweetsPerCategory);
        results[category.name] = tweets;
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`Error fetching ${category.name}:`, err.message);
        results[category.name] = [];
      }
    }
    
    return results;
  }
}

module.exports = XClient;
