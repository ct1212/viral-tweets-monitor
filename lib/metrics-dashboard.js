// Weekly Metrics Dashboard
// Tracks @chainlinkp growth metrics over time
// Low cost: 1 API call per week

const fs = require('fs').promises;
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'growth-metrics.json');

class MetricsDashboard {
  constructor(xClient) {
    this.xClient = xClient;
  }

  // Log current metrics
  // Call this once per week
  async logMetrics(impressions, followers, following, engagementRate) {
    await this.ensureDataFile();
    
    const data = await this.loadData();
    
    const entry = {
      date: new Date().toISOString(),
      week: this.getWeekNumber(),
      impressions,
      followers,
      following,
      engagementRate,
      // Calculate deltas if previous entry exists
      deltas: {}
    };
    
    if (data.entries.length > 0) {
      const last = data.entries[data.entries.length - 1];
      entry.deltas = {
        impressions: impressions - last.impressions,
        followers: followers - last.followers,
        engagementRate: (engagementRate - last.engagementRate).toFixed(2)
      };
    }
    
    data.entries.push(entry);
    await this.saveData(data);
    
    console.log('✅ Metrics logged');
    return entry;
  }

  // Generate weekly report
  async generateReport() {
    const data = await this.loadData();
    
    if (data.entries.length === 0) {
      return 'No metrics data yet. Run logMetrics first.';
    }
    
    const latest = data.entries[data.entries.length - 1];
    const start = data.entries[0];
    const daysActive = Math.floor((new Date(latest.date) - new Date(start.date)) / (1000 * 60 * 60 * 24));
    
    // Calculate if on pace for 5M in 3 months
    const targetEndDate = new Date(start.date);
    targetEndDate.setDate(targetEndDate.getDate() + 90);
    
    const daysRemaining = Math.floor((targetEndDate - new Date()) / (1000 * 60 * 60 * 24));
    const impressionsNeeded = 5000000 - latest.impressions;
    const dailyPaceNeeded = daysRemaining > 0 ? Math.ceil(impressionsNeeded / daysRemaining) : 0;
    
    // Calculate current 7-day average if we have enough data
    let currentPace = 0;
    if (data.entries.length >= 2) {
      const lastWeek = data.entries[data.entries.length - 1];
      const prevWeek = data.entries[data.entries.length - 2];
      const daysBetween = Math.floor((new Date(lastWeek.date) - new Date(prevWeek.date)) / (1000 * 60 * 60 * 24));
      if (daysBetween > 0) {
        currentPace = Math.round((lastWeek.impressions - prevWeek.impressions) / daysBetween);
      }
    }
    
    return {
      period: {
        start: start.date,
        latest: latest.date,
        daysActive
      },
      current: {
        impressions: latest.impressions.toLocaleString(),
        followers: latest.followers.toLocaleString(),
        engagementRate: latest.engagementRate + '%'
      },
      progress: {
        toGoal: `${((latest.impressions / 5000000) * 100).toFixed(1)}% of 5M target`,
        daysRemaining,
        onTrack: currentPace >= dailyPaceNeeded
      },
      pace: {
        currentDaily: currentPace.toLocaleString(),
        neededDaily: dailyPaceNeeded.toLocaleString()
      },
      deltas: latest.deltas,
      status: this.getStatusMessage(currentPace, dailyPaceNeeded, latest.impressions)
    };
  }

  getStatusMessage(current, needed, total) {
    if (current === 0) return 'Need more data for pace calculation';
    
    const ratio = current / needed;
    if (ratio >= 1.2) return '🚀 CRUSHING IT — ahead of pace';
    if (ratio >= 1.0) return '✅ On track — keep it up';
    if (ratio >= 0.7) return '⚠️ Slightly behind — need more volume';
    return '🔥 OFF PACE — time to grind harder';
  }

  // Simple chart visualization
  async generateChart() {
    const data = await this.loadData();
    
    if (data.entries.length < 2) {
      return 'Need at least 2 data points for chart';
    }
    
    const entries = data.entries.slice(-10); // Last 10 entries
    
    let chart = '```\nIMPRESSIONS GROWTH\n';
    chart += 'Week  |  Impressions  |  Trend\n';
    chart += '──────┼───────────────┼────────\n';
    
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const week = (i + 1).toString().padStart(2);
      const imp = e.impressions.toLocaleString().padStart(13);
      
      let trend = '─';
      if (i > 0) {
        const prev = entries[i - 1];
        trend = e.impressions > prev.impressions ? '↗' : '→';
      }
      
      chart += `${week}    | ${imp} |   ${trend}\n`;
    }
    
    chart += '```';
    return chart;
  }

  getWeekNumber() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.floor(diff / oneWeek) + 1;
  }

  async ensureDataFile() {
    const dir = path.dirname(DATA_FILE);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {}
    
    try {
      await fs.access(DATA_FILE);
    } catch {
      await this.saveData({ entries: [], goal: 5000000, startDate: new Date().toISOString() });
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

module.exports = MetricsDashboard;
