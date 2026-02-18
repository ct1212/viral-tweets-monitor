// X (Twitter) API v2 Client
// Uses Bearer Token authentication

class XClient {
  constructor(bearerToken) {
    this.bearerToken = bearerToken;
    this.baseUrl = 'https://api.twitter.com/2';
  }

  async searchRecentTweets(query, maxResults = 10) {
    // Search recent tweets from the last hour only
    const url = new URL(`${this.baseUrl}/tweets/search/recent`);
    url.searchParams.append('query', query);
    url.searchParams.append('max_results', Math.min(maxResults, 100).toString());
    url.searchParams.append('tweet.fields', 'public_metrics,author_id,created_at,context_annotations');
    url.searchParams.append('expansions', 'author_id');
    url.searchParams.append('user.fields', 'username,public_metrics,verified');
    url.searchParams.append('sort_order', 'relevancy');

    // Only fetch tweets from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    url.searchParams.append('start_time', oneHourAgo.toISOString());

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
        url: `https://x.com/${author?.username || 'user'}/status/${tweet.id}`,
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
  // Uses from: queries targeting influential accounts since X API Basic
  // tier doesn't support min_faves and keyword searches return mostly spam.
  async fetchCategoryTweets(categories, tweetsPerCategory = 10) {
    const results = {};

    for (const category of categories) {
      try {
        const fromClause = category.accounts
          .map(a => `from:${a}`)
          .join(' OR ');
        const query = `(${fromClause}) -is:reply -is:retweet lang:en`;

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

  // Get tweets from a specific user
  async getUserTweets(username, maxResults = 100) {
    // First get user ID from username
    const userUrl = new URL(`${this.baseUrl}/users/by/username/${username}`);
    userUrl.searchParams.append('user.fields', 'public_metrics');
    
    const userResponse = await fetch(userUrl, {
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!userResponse.ok) {
      throw new Error(`Failed to get user: ${userResponse.status}`);
    }
    
    const userData = await userResponse.json();
    const userId = userData.data?.id;
    
    if (!userId) {
      throw new Error('User not found');
    }
    
    // Get user's tweets
    const tweetsUrl = new URL(`${this.baseUrl}/users/${userId}/tweets`);
    tweetsUrl.searchParams.append('max_results', Math.min(maxResults, 100).toString());
    tweetsUrl.searchParams.append('tweet.fields', 'public_metrics,created_at');
    tweetsUrl.searchParams.append('exclude', 'replies,retweets');
    
    const response = await fetch(tweetsUrl, {
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
    return (data.data || []).map(tweet => ({
      id: tweet.id,
      text: tweet.text,
      url: `https://x.com/${username}/status/${tweet.id}`,
      createdAt: tweet.created_at,
      metrics: {
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0,
        quotes: tweet.public_metrics?.quote_count || 0,
        impressions: tweet.public_metrics?.impression_count || 0
      }
    }));
  }
  
  // Get metrics for a specific tweet
  async getTweetMetrics(tweetId) {
    const url = new URL(`${this.baseUrl}/tweets/${tweetId}`);
    url.searchParams.append('tweet.fields', 'public_metrics');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to get tweet metrics: ${response.status}`);
    }
    
    const data = await response.json();
    const metrics = data.data?.public_metrics || {};
    
    return {
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      quotes: metrics.quote_count || 0,
      impressions: metrics.impression_count || 0
    };
  }
}

module.exports = XClient;
