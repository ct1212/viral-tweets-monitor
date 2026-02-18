#!/usr/bin/env node
// Control script for viral-tweets-monitor
// Enable/disable from command line or Discord

const fs = require('fs');
const path = require('path');

const STATUS_FILE = '/home/agent/.openclaw/viral-tweets-monitor.status';

function getStatus() {
  try {
    return fs.readFileSync(STATUS_FILE, 'utf8').trim();
  } catch {
    return 'disabled'; // Default to off
  }
}

function setStatus(status) {
  fs.writeFileSync(STATUS_FILE, status);
  console.log(`Viral tweets monitor: ${status}`);
}

const command = process.argv[2];

switch (command) {
  case 'on':
  case 'enable':
    setStatus('enabled');
    break;
  case 'off':
  case 'disable':
    setStatus('disabled');
    break;
  case 'status':
    console.log(`Status: ${getStatus()}`);
    break;
  case 'toggle':
    const current = getStatus();
    const next = current === 'enabled' ? 'disabled' : 'enabled';
    setStatus(next);
    break;
  default:
    console.log('Usage: node control.js [on|off|status|toggle]');
    console.log(`Current status: ${getStatus()}`);
}
