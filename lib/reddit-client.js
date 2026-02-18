// Reddit API Client
// Free tier: 100 requests/minute, no search fees

class RedditClient {
  constructor() {
    this.baseUrl = 'https://www.reddit.com';
    this.userAgent = 'ViralMonitor/1.0';
  }

  async fetchHotPosts(subreddit, limit = 25) {
    const url = `${this.baseUrl}/r/${subreddit}/hot.json?limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatPosts(data.data.children);
  }

  async fetchRisingPosts(subreddit, limit = 25) {
    const url = `${this.baseUrl}/r/${subreddit}/rising.json?limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const data = await response.json();
    return this.formatPosts(data.data.children);
  }

  formatPosts(posts) {
    return posts.map(post => {
      const p = post.data;
      return {
        id: p.id,
        title: p.title,
        text: p.selftext || p.title,
        url: `https://reddit.com${p.permalink}`,
        author: p.author,
        subreddit: p.subreddit,
        createdAt: new Date(p.created_utc * 1000).toISOString(),
        metrics: {
          upvotes: p.ups,
          comments: p.num_comments,
          upvoteRatio: p.upvote_ratio,
          score: p.score
        },
        // Viral score: engagement velocity
        viralScore: p.score + (p.num_comments * 5),
        isSelfPost: p.is_self
      };
    });
  }

  // Get viral posts from multiple crypto subreddits
  async fetchCryptoViral(limit = 10) {
    const subreddits = ['CryptoCurrency', 'ethtrader', 'Chainlink', 'defi'];
    const allPosts = [];

    for (const sub of subreddits) {
      try {
        const posts = await this.fetchHotPosts(sub, limit);
        allPosts.push(...posts);
        await new Promise(r => setTimeout(r, 100)); // Rate limit safety
      } catch (err) {
        console.error(`Error fetching r/${sub}:`, err.message);
      }
    }

    // Sort by viral score and return top
    return allPosts
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, limit);
  }
}

module.exports = RedditClient;
