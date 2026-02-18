#!/usr/bin/env node
// Growth Tracker for @chainlinkp
// Logs daily metrics and progress toward monetization

const fs = require('fs').promises;
const path = require('path');

const LOG_DIR = '/home/agent/.openclaw/viral-tweets-monitor';
const LOG_FILE = path.join(LOG_DIR, 'growth-metrics.jsonl');

async function ensureDir() {
  await fs.mkdir(LOG_DIR, { recursive: true });
}

// Log daily snapshot
async function logDaily(metrics) {
  await ensureDir();
  
  const entry = {
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    impressions_28d: metrics.impressions_28d || 0,
    followers: metrics.followers || 0,
    replies_today: metrics.replies_today || 0,
    engagement_rate: metrics.engagement_rate || 0,
    target_impressions_3m: 5000000,
    current_pace_3m: (metrics.impressions_28d || 0) * 3.2 // Rough extrapolation
  };
  
  await fs.appendFile(LOG_FILE, JSON.stringify(entry) + '\n');
  
  // Print status
  console.log('\n📊 @chainlinkp Daily Snapshot');
  console.log('============================');
  console.log(`Date: ${entry.date}`);
  console.log(`28-day impressions: ${entry.impressions_28d.toLocaleString()}`);
  console.log(`Followers: ${entry.followers.toLocaleString()}`);
  console.log(`Replies today: ${entry.replies_today}`);
  console.log(`Engagement rate: ${entry.engagement_rate}%`);
  console.log(`3M pace: ${entry.current_pace_3m.toLocaleString()} / 5,000,000`);
  console.log(`Progress: ${((entry.current_pace_3m / 5000000) * 100).toFixed(1)}%`);
  
  // Alert if behind pace
  if (entry.current_pace_3m < 4000000 && entry.current_pace_3m > 0) {
    console.log('\n⚠️  BEHIND PACE - Need to increase reply volume');
  }
  
  console.log('');
  return entry;
}

// Get last 7 days
async function getWeeklyReport() {
  try {
    const lines = (await fs.readFile(LOG_FILE, 'utf8')).trim().split('\n').filter(Boolean);
    const entries = lines.slice(-7).map(JSON.parse);
    
    if (entries.length === 0) return null;
    
    const latest = entries[entries.length - 1];
    const first = entries[0];
    
    return {
      days_tracked: entries.length,
      latest_impressions: latest.impressions_28d,
      latest_followers: latest.followers,
      impression_change: latest.impressions_28d - first.impressions_28d,
      avg_replies_per_day: entries.reduce((s, e) => s + e.replies_today, 0) / entries.length,
      on_track_for_monetization: latest.current_pace_3m >= 5000000,
      entries
    };
  } catch {
    return null;
  }
}

// Generate weekly accountability report
async function generateWeeklyReport() {
  const report = await getWeeklyReport();
  
  if (!report) {
    console.log('No data yet. Start logging daily metrics.');
    return;
  }
  
  console.log('\n📈 WEEKLY ACCOUNTABILITY REPORT');
  console.log('================================');
  console.log(`Days tracked: ${report.days_tracked}`);
  console.log(`Current 28d impressions: ${report.latest_impressions.toLocaleString()}`);
  console.log(`Followers: ${report.latest_followers.toLocaleString()}`);
  console.log(`7-day impression change: ${report.impression_change > 0 ? '+' : ''}${report.impression_change.toLocaleString()}`);
  console.log(`Avg replies/day: ${report.avg_replies_per_day.toFixed(1)}`);
  console.log(`On track for monetization: ${report.on_track_for_monetization ? '✅ YES' : '❌ NO'}`);
  
  if (!report.on_track_for_monetization) {
    console.log('\n🎯 ACTION NEEDED:');
    console.log('   - Increase reply volume to 15-20/day');
    console.log('   - Focus on high-engagement threads');
    console.log('   - Post 2 threads this week');
  }
  
  console.log('');
  return report;
}

// If run directly
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'log':
      const metrics = {
        impressions_28d: parseInt(process.argv[3]) || 0,
        followers: parseInt(process.argv[4]) || 0,
        replies_today: parseInt(process.argv[5]) || 0,
        engagement_rate: parseFloat(process.argv[6]) || 0
      };
      logDaily(metrics);
      break;
    case 'weekly':
      generateWeeklyReport();
      break;
    default:
      console.log('Usage:');
      console.log('  node tracker.js log <impressions> <followers> <replies> <engagement_rate>');
      console.log('  node tracker.js weekly');
      console.log('\nExample:');
      console.log('  node tracker.js log 1000000 20500 12 3.4');
  }
}

module.exports = { logDaily, getWeeklyReport, generateWeeklyReport };
