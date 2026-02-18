#!/usr/bin/env node
// CLI for new tracking tools
// Usage: node tracker.js [command]

const XClient = require('./lib/x-client');
const ReplyTracker = require('./lib/reply-tracker');
const VoiceTrainer = require('./lib/voice-trainer');
const MetricsDashboard = require('./lib/metrics-dashboard');

// Load env
require('dotenv').config({ path: './.env.local' });

const xClient = new XClient(process.env.X_BEARER_TOKEN);

const commands = {
  // Reply tracking
  'log-reply': async (tweetId, originalUrl, text) => {
    const tracker = new ReplyTracker(xClient);
    await tracker.logReply(tweetId, originalUrl, text);
    console.log('Reply logged. Check engagement tomorrow with: node tracker.js check');
  },
  
  'check': async () => {
    const tracker = new ReplyTracker(xClient);
    await tracker.checkEngagement();
  },
  
  'weekly': async () => {
    const tracker = new ReplyTracker(xClient);
    const report = await tracker.generateReport();
    console.log('\n📊 REPLY PERFORMANCE REPORT\n');
    console.log(JSON.stringify(report, null, 2));
  },
  
  // Voice training
  'train-voice': async () => {
    const trainer = new VoiceTrainer(xClient);
    await trainer.analyzeHistory('chainlinkp', 50);
    console.log('\n✅ Voice profile created. View with: node tracker.js voice-summary');
  },
  
  'voice-summary': async () => {
    const trainer = new VoiceTrainer(xClient);
    const summary = await trainer.getVoiceSummary();
    if (!summary) {
      console.log('No voice profile. Run: node tracker.js train-voice');
      return;
    }
    console.log('\n🎭 @chainlinkp VOICE PROFILE\n');
    console.log(`Analyzed: ${summary.analyzed}`);
    console.log(`Tweets: ${summary.totalTweets}`);
    console.log(`High performers: ${summary.highPerformers}`);
    console.log(`Sweet spot: ${summary.sweetSpot}`);
    console.log('\nTop templates:');
    summary.topTemplates.forEach(t => console.log(`  • ${t.pattern} (${t.count}x)`));
    console.log('\nTop phrases:');
    summary.topPhrases.forEach(p => console.log(`  • "${p.phrase}" (${p.count}x)`));
  },
  
  'suggest': async (context) => {
    const trainer = new VoiceTrainer(xClient);
    const suggestion = await trainer.generateReply(context || 'neutral', '');
    console.log('\n💡 REPLY SUGGESTION\n');
    console.log(JSON.stringify(suggestion, null, 2));
  },
  
  // Metrics
  'log-metrics': async (imp, fol, following, eng) => {
    const dash = new MetricsDashboard(xClient);
    await dash.logMetrics(
      parseInt(imp),
      parseInt(fol),
      parseInt(following),
      parseFloat(eng)
    );
    console.log('Metrics logged. View report with: node tracker.js report');
  },
  
  'report': async () => {
    const dash = new MetricsDashboard(xClient);
    const report = await dash.generateReport();
    console.log('\n📈 GROWTH DASHBOARD\n');
    console.log(JSON.stringify(report, null, 2));
  },
  
  'chart': async () => {
    const dash = new MetricsDashboard(xClient);
    const chart = await dash.generateChart();
    console.log(chart);
  }
};

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  
  if (!cmd || cmd === 'help') {
    console.log(`
Usage: node tracker.js [command] [args]

Reply Tracking:
  log-reply [tweetId] [originalUrl] [text]  Log a reply you posted
  check                                      Check engagement on logged replies
  weekly                                     Generate weekly reply performance report

Voice Training:
  train-voice                                Analyze your tweet history
  voice-summary                              Show your voice profile
  suggest [context]                          Get reply suggestion (context: imminent|positive|neutral)

Metrics Dashboard:
  log-metrics [imp] [fol] [following] [eng]  Log weekly metrics
  report                                     Show growth report
  chart                                      Show impressions chart
    `);
    return;
  }
  
  const fn = commands[cmd];
  if (!fn) {
    console.log(`Unknown command: ${cmd}`);
    console.log('Run: node tracker.js help');
    return;
  }
  
  try {
    await fn(...args);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
