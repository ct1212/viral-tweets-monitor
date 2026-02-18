// Reply Performance Tracker
// Logs your replies and tracks engagement over time
// Low API cost: only fetches YOUR tweets periodically

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'reply-performance.json');

class ReplyTracker {
  constructor(xClient) {
    this.xClient = xClient;
  }

  // Log a reply you made
  async logReply(tweetId, originalTweetUrl, replyText, category = 'viral') {
    await this.ensureDataFile();
    
    const data = await this.loadData();
    
    data.replies.push({
      id: tweetId,
      originalTweetUrl,
      replyText,
      category, // 'viral', 'chainlink-quote', 'original'
      postedAt: new Date().toISOString(),
      metrics: null, // filled in later
      checkedAt: null
    });
    
    await this.saveData(data);
    console.log(`✅ Logged reply: ${tweetId}`);
  }

  // Check engagement on all un-checked replies
  // Run this once per day (low cost)
  async checkEngagement() {
    await this.ensureDataFile();
    const data = await this.loadData();
    
    const unchecked = data.replies.filter(r => !r.checkedAt);
    
    if (unchecked.length === 0) {
      console.log('No new replies to check.');
      return;
    }

    console.log(`Checking engagement on ${unchecked.length} replies...`);
    
    for (const reply of unchecked) {
      try {
        const metrics = await this.xClient.getTweetMetrics(reply.id);
        reply.metrics = metrics;
        reply.checkedAt = new Date().toISOString();
        
        // Small delay to avoid rate limits
        await new Promise(r => setTimeout(r, 100));
      } catch (err) {
        console.error(`Failed to check ${reply.id}:`, err.message);
      }
    }
    
    await this.saveData(data);
    console.log('✅ Engagement updated');
  }

  // Generate weekly report
  async generateReport() {
    const data = await this.loadData();
    
    const now = new Date();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    const weekReplies = data.replies.filter(r => 
      new Date(r.postedAt) >= weekAgo && r.metrics
    );
    
    if (weekReplies.length === 0) {
      return 'No completed replies this week yet.';
    }

    // Calculate stats
    const totalLikes = weekReplies.reduce((sum, r) => sum + (r.metrics.likes || 0), 0);
    const avgLikes = totalLikes / weekReplies.length;
    
    // Sort by performance
    const sorted = [...weekReplies].sort((a, b) => 
      (b.metrics.likes || 0) - (a.metrics.likes || 0)
    );
    
    const top3 = sorted.slice(0, 3);
    
    return {
      period: 'Last 7 days',
      totalReplies: weekReplies.length,
      totalLikes,
      avgLikes: Math.round(avgLikes),
      topPerformers: top3.map(r => ({
        text: r.replyText.substring(0, 80) + (r.replyText.length > 80 ? '...' : ''),
        likes: r.metrics.likes,
        url: `https://twitter.com/chainlinkp/status/${r.id}`
      })),
      insights: this.generateInsights(sorted)
    };
  }

  generateInsights(replies) {
    if (replies.length < 5) return 'Need more data for insights.';
    
    const highPerformers = replies.filter(r => (r.metrics.likes || 0) >= 10);
    const lowPerformers = replies.filter(r => (r.metrics.likes || 0) < 5);
    
    const avgLengthHigh = highPerformers.reduce((sum, r) => sum + r.replyText.length, 0) / highPerformers.length;
    const avgLengthLow = lowPerformers.reduce((sum, r) => sum + r.replyText.length, 0) / lowPerformers.length;
    
    return {
      pattern: avgLengthHigh < avgLengthLow ? 'Shorter replies perform better' : 'Longer replies perform better',
      highPerformerCount: highPerformers.length,
      tip: highPerformers.length > 0 
        ? 'Your winning replies are typically under 100 chars with punchy takes'
        : 'Keep posting to build pattern data'
    };
  }

  async ensureDataFile() {
    const dir = path.dirname(DATA_FILE);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {}
    
    try {
      await fs.access(DATA_FILE);
    } catch {
      await this.saveData({ replies: [] });
    }
  }

  async loadData() {
    const content = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(content);
  }

  async saveData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  }
}

module.exports = ReplyTracker;
