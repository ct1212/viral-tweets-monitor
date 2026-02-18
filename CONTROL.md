# Viral Tweets Monitor - Control System

## Status File

Create `/home/agent/.openclaw/viral-tweets-monitor.status` to control the monitor:

- `enabled` - Monitor runs normally
- `disabled` - Monitor skips all runs
- `pause` - Temporarily pause (preserves state)

## Discord Commands

Post in #general:
- `!viral on` - Enable monitor
- `!viral off` - Disable monitor  
- `!viral status` - Check current status
- `!viral test` - Run one test cycle

## Implementation

The monitor checks this file at startup:
- If `disabled` or missing → exits immediately
- If `enabled` → runs normally

## Manual Control

```bash
# Enable
echo "enabled" > /home/agent/.openclaw/viral-tweets-monitor.status

# Disable
echo "disabled" > /home/agent/.openclaw/viral-tweets-monitor.status

# Check status
cat /home/agent/.openclaw/viral-tweets-monitor.status
```
