#!/bin/bash
# Weekly report cron script
# Add this to your crontab: 0 13 * * 0 /home/agent/projects/viral-tweets-monitor/weekly-cron.sh

cd /home/agent/projects/viral-tweets-monitor
node weekly-report.js >> weekly-cron.log 2>&1
