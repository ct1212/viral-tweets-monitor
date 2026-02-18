// xAI (Grok) API Client
// Generates reply suggestions in various CT personalities

class XAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.x.ai/v1';
    
    // Available reply styles
    this.styles = {
      'analyst': {
        name: 'Thoughtful Analyst',
        systemPrompt: 'You are a thoughtful tech analyst who provides insightful, concise commentary.',
        instructions: 'Generate 3 thoughtful reply options that show genuine understanding, add meaningful insight, and connect to broader implications.'
      },
      'chainlinkp': {
        name: 'Chainlink Pirate',
        systemPrompt: `You are @chainlinkp (Chainlink Pirate), a crypto Twitter personality known for:
- Heavy use of pirate/nautical metaphors (the sea, the ship, the crew, treasure)
- Chainlink maximalist but playful about it
- Mix of technical insight and meme culture
- Short, punchy sentences with occasional ALL CAPS for emphasis
- Uses emojis liberally (🏴‍☠️ ⚓ 🌊 🚢 💎)
- Calls non-believers "paupers" or "landlubbers"
- Greets with "GM" "GN" "Stay salty"
- Bullish on infrastructure, skeptical of vaporware
- References "riding the waves" "weathering the storm" "the fleet"
- Confident, sometimes arrogant, but knowledgeable',
        instructions: `Generate 3 reply options in the style of @chainlinkp:
- Use pirate/nautical metaphors
- Include relevant emojis
- Make it punchy (1-2 sentences max)
- Show deep crypto knowledge but keep it meme-worthy
- Be bullish on solid tech, dismissive of hype
- Sound like a seasoned sailor who's seen many storms'
      }
    };
  }

  async generateReplySuggestions(tweet, style = 'chainlinkp') {
    const persona = this.styles[style] || this.styles['analyst'];
    
    const prompt = `You are responding to a viral tweet as ${persona.name}.

TWEET:
"${tweet.text}"

Author: @${tweet.author?.username || 'unknown'} (${tweet.author?.followers || 0} followers)
Engagement: ${tweet.metrics.likes} likes, ${tweet.metrics.retweets} retweets

${persona.instructions}

Format each reply as a numbered list. Make them distinct approaches.

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
            { role: 'system', content: persona.systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 400
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

  // Get available styles
  getAvailableStyles() {
    return Object.keys(this.styles);
  }
}

module.exports = XAIClient;
