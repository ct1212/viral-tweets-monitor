// @chainlinkp Voice Trainer
// Analyzes your past tweets to extract winning patterns
// One-time cost: ~100 API calls to fetch your history

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'voice-profile.json');

class VoiceTrainer {
  constructor(xClient) {
    this.xClient = xClient;
  }

  // Analyze your tweet history
  // username: 'chainlinkp'
  // minLikes: threshold for "high performing" tweets
  async analyzeHistory(username, minLikes = 50) {
    console.log(`🔍 Analyzing @${username} tweet history...`);
    
    // Fetch last 100 tweets
    const tweets = await this.xClient.getUserTweets(username, 100);
    console.log(`Fetched ${tweets.length} tweets`);
    
    // Separate high vs low performers
    const highPerformers = tweets.filter(t => (t.metrics?.likes || 0) >= minLikes);
    const lowPerformers = tweets.filter(t => (t.metrics?.likes || 0) < minLikes);
    
    console.log(`High performers: ${highPerformers.length}`);
    console.log(`Low performers: ${lowPerformers.length}`);
    
    // Extract patterns
    const profile = {
      username,
      analyzedAt: new Date().toISOString(),
      totalTweets: tweets.length,
      highPerformerCount: highPerformers.length,
      patterns: this.extractPatterns(highPerformers, lowPerformers),
      templates: this.extractTemplates(highPerformers),
      commonPhrases: this.extractPhrases(highPerformers),
      lengthStats: this.analyzeLength(highPerformers, lowPerformers)
    };
    
    await this.saveProfile(profile);
    console.log('✅ Voice profile saved');
    
    return profile;
  }

  extractPatterns(high, low) {
    const patterns = {
      winning: [],
      avoid: []
    };
    
    // Check for common patterns in high performers
    const hasShortReplies = high.filter(t => t.text.length < 50).length / high.length;
    const hasQuestions = high.filter(t => t.text.includes('?')).length / high.length;
    const hasExclamations = high.filter(t => t.text.includes('!')).length / high.length;
    const hasPeriods = high.filter(t => t.text.endsWith('.')).length / high.length;
    
    if (hasShortReplies > 0.6) {
      patterns.winning.push('Short replies (under 50 chars) perform better');
    }
    if (hasQuestions > 0.3) {
      patterns.winning.push('Questions drive engagement');
    }
    if (hasExclamations > hasPeriods) {
      patterns.winning.push('Exclamations over periods');
    }
    
    // Check low performers for anti-patterns
    const longLowPerformers = low.filter(t => t.text.length > 150).length / low.length;
    if (longLowPerformers > 0.5) {
      patterns.avoid.push('Long replies (>150 chars) underperform');
    }
    
    return patterns;
  }

  extractTemplates(highPerformers) {
    // Extract tweet structures that repeat
    const templates = [];
    
    // Look for specific @chainlinkp patterns
    const tickTockTweets = highPerformers.filter(t => 
      t.text.toLowerCase().includes('tick tock')
    );
    if (tickTockTweets.length > 0) {
      templates.push({
        pattern: 'Tick tock.',
        example: tickTockTweets[0].text,
        usage: 'For imminent news/buildup',
        count: tickTockTweets.length
      });
    }
    
    const loveToSeeIt = highPerformers.filter(t => 
      t.text.toLowerCase().includes('you love to see it')
    );
    if (loveToSeeIt.length > 0) {
      templates.push({
        pattern: 'You love to see it.',
        example: loveToSeeIt[0].text,
        usage: 'For good news/positive developments',
        count: loveToSeeIt.length
      });
    }
    
    const shortTakes = highPerformers.filter(t => 
      t.text.length < 60 && !t.text.includes('http')
    );
    if (shortTakes.length > 3) {
      templates.push({
        pattern: 'Short observation (< 60 chars)',
        example: shortTakes[0].text,
        usage: 'Quick reactions to news',
        count: shortTakes.length
      });
    }
    
    return templates;
  }

  extractPhrases(highPerformers) {
    const phraseCounts = {};
    
    const commonPhrases = [
      'tick tock', 'you love to see it', 'bullish', 'bearish',
      'this is', 'pretty', 'very cool', 'unreal', 'incredible',
      'shit', 'damn', 'fuck', 'hell', 'insane', 'enormous'
    ];
    
    for (const tweet of highPerformers) {
      const text = tweet.text.toLowerCase();
      for (const phrase of commonPhrases) {
        if (text.includes(phrase)) {
          phraseCounts[phrase] = (phraseCounts[phrase] || 0) + 1;
        }
      }
    }
    
    // Sort by frequency
    return Object.entries(phraseCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([phrase, count]) => ({ phrase, count }));
  }

  analyzeLength(high, low) {
    const highLengths = high.map(t => t.text.length);
    const lowLengths = low.map(t => t.text.length);
    
    const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
    
    return {
      highPerformer: {
        avgLength: Math.round(avg(highLengths)),
        min: Math.min(...highLengths),
        max: Math.max(...highLengths),
        sweetSpot: this.findSweetSpot(highLengths)
      },
      lowPerformer: {
        avgLength: Math.round(avg(lowLengths)),
        min: Math.min(...lowLengths),
        max: Math.max(...lowLengths)
      }
    };
  }

  findSweetSpot(lengths) {
    // Find most common length range
    const ranges = {
      'short (<50)': lengths.filter(l => l < 50).length,
      'medium (50-100)': lengths.filter(l => l >= 50 && l < 100).length,
      'long (100+)': lengths.filter(l => l >= 100).length
    };
    
    const best = Object.entries(ranges).sort((a, b) => b[1] - a[1])[0];
    return best[0];
  }

  // Generate a reply suggestion based on your voice
  async generateReply(context, tweetText) {
    const profile = await this.loadProfile();
    
    if (!profile) {
      return 'Voice profile not found. Run analyzeHistory first.';
    }
    
    // Pick a template based on context
    const template = this.selectTemplate(profile.templates, context);
    
    // Apply your patterns
    const suggestion = this.applyVoice(template, profile);
    
    return suggestion;
  }

  selectTemplate(templates, context) {
    // Context: 'imminent', 'positive', 'negative', 'neutral'
    if (context === 'imminent') {
      return templates.find(t => t.pattern.includes('Tick tock')) || templates[0];
    }
    if (context === 'positive') {
      return templates.find(t => t.pattern.includes('love to see')) || templates[0];
    }
    return templates[0] || { pattern: 'Short observation' };
  }

  applyVoice(template, profile) {
    const { sweetSpot } = profile.lengthStats.highPerformer;
    
    // Return guidelines rather than generated text
    // (to avoid API costs for generation)
    return {
      template: template.pattern,
      example: template.example,
      guidelines: [
        `Target length: ${sweetSpot}`,
        `Common phrases: ${profile.commonPhrases.slice(0, 3).map(p => p.phrase).join(', ')}`,
        'Use short sentences',
        'Avoid emojis',
        template.usage ? `Context: ${template.usage}` : null
      ].filter(Boolean)
    };
  }

  async saveProfile(profile) {
    const dir = path.dirname(DATA_FILE);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {}
    
    await fs.writeFile(DATA_FILE, JSON.stringify(profile, null, 2));
  }

  async loadProfile() {
    try {
      const content = await fs.readFile(DATA_FILE, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  // Get summary for display
  async getVoiceSummary() {
    const profile = await this.loadProfile();
    if (!profile) return null;
    
    return {
      analyzed: profile.analyzedAt,
      totalTweets: profile.totalTweets,
      highPerformers: profile.highPerformerCount,
      sweetSpot: profile.lengthStats.highPerformer.sweetSpot,
      topTemplates: profile.templates.slice(0, 3),
      topPhrases: profile.commonPhrases.slice(0, 5)
    };
  }
}

module.exports = VoiceTrainer;
