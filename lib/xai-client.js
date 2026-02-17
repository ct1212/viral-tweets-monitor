// xAI (Grok) API Client
// Generates thoughtful reply suggestions

class XAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.x.ai/v1';
  }

  async generateReplySuggestions(tweet) {
    const prompt = `You are an informed tech/crypto/AI analyst. A tweet just went viral and I want to respond thoughtfully.

TWEET:
"${tweet.text}"

Author: @${tweet.author?.username || 'unknown'} (${tweet.author?.followers || 0} followers)
Engagement: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets

Generate 3 thoughtful reply options that:
1. Show genuine understanding of the topic
2. Add meaningful insight or perspective
3. Connect to broader implications (industry, users, society)
4. Are concise (1-2 sentences each)
5. Sound natural and conversational (not corporate/promotional)

Format each reply as a numbered list. Make them distinct approaches:
- Reply 1: Direct analytical take
- Reply 2: Question/challenge that adds depth  
- Reply 3: Connect to bigger picture/implications

REPLY OPTIONS:`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'grok-2-1212',  // Latest Grok model
          messages: [
            { role: 'system', content: 'You are a thoughtful tech analyst who provides insightful, concise commentary.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 400
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`xAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Parse numbered list into array
      return this.parseReplies(content);
    } catch (err) {
      console.error('xAI error:', err.message);
      return ['Error generating reply suggestions'];
    }
  }

  parseReplies(content) {
    // Extract numbered items (1. 2. 3. or 1) 2) 3))
    const lines = content.split('\n').filter(line => line.trim());
    const replies = [];
    
    for (const line of lines) {
      // Match lines starting with numbers
      const match = line.match(/^\d+[\.\)]\s*(.+)$/);
      if (match) {
        replies.push(match[1].trim());
      }
    }
    
    // If no structured list found, split by double newline
    if (replies.length === 0) {
      return content.split(/\n\n+/).map(r => r.trim()).filter(r => r.length > 10).slice(0, 3);
    }
    
    return replies.slice(0, 3);
  }
}

module.exports = XAIClient;
