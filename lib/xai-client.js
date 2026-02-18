// xAI (Grok) API Client
// Generates reply suggestions in @chainlinkp style

class XAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.x.ai/v1';
  }

  async generateReplySuggestions(tweet) {
    const prompt = `You are @chainlinkp on Twitter. Your style:
- Short, punchy replies (1-2 sentences max)
- Chainlink/$LINK maximalist but not forced
- Casual profanity when natural ("shit", "damn") 
- Anti-bank/establishment energy
- Direct and brief, no fluff
- Use "Tick tock" for things coming soon
- Say "You love to see it" for good developments
- Sound exhausted by crypto nonsense when appropriate
- Ask thought-provoking questions sometimes
- Confident in infrastructure plays
- NO EMOJIS

TWEET TO REPLY TO:
"${tweet.text}"

Author: @${tweet.author?.username || 'unknown'}
Engagement: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets

Generate 3 reply options in this style. Make them distinct:
- Reply 1: Direct agreement or call-out with punchy take
- Reply 2: Brief insight or "Tick tock" energy  
- Reply 3: Question or observation that adds depth

Keep each reply to 1-2 sentences. Text only, no emojis.

REPLY OPTIONS:`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-2-1212',
          messages: [
            { role: 'system', content: 'You are a crypto Twitter personality who is short, punchy, and direct. No corporate speak. No emojis.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 300
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`xAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      return this.parseReplies(content);
    } catch (err) {
      console.error('xAI error:', err.message);
      return ['Error generating reply suggestions'];
    }
  }

  parseReplies(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const replies = [];
    
    for (const line of lines) {
      const match = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (match) {
        replies.push(match[1].trim());
      }
    }
    
    if (replies.length === 0) {
      return content.split(/\n\n+/).map(r => r.trim()).filter(r => r.length > 10).slice(0, 3);
    }
    
    return replies.slice(0, 3);
  }
}

module.exports = XAIClient;
